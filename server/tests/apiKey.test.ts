import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const KEY = "cle-automator-de-test-0123456789-abcdefghij"; // ≥ 32 caractères

let baseUrl: string;
let server: Server;
let config: typeof import("../src/config.js").config;

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "msb-test-"));
  process.env.DATA_DIR = tmpDir;
  process.env.ADMINS_PATH = path.join(tmpDir, "admins.json");
  process.env.PROJECTS_PATH = path.join(tmpDir, "projects.json");
  process.env.SIGNUPS_PATH = path.join(tmpDir, "signups.json");
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "bootstrap-pass-123";
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.AUTOMATOR_API_KEY = KEY;
  // Volontairement pas d'AIRTABLE_API_KEY : on vérifie seulement l'authentification.

  ({ config } = await import("../src/config.js"));
  const { createApp } = await import("../src/api/app.js");
  const { ensureBootstrapAdmin } = await import("../src/services/authService.js");
  ensureBootstrapAdmin();
  const app = createApp();
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});

afterAll(() => {
  server.close();
});

const get = (url: string, headers: Record<string, string> = {}) => fetch(`${baseUrl}${url}`, { headers });

describe("clé d'API (Automator)", () => {
  it("laisse lire les inscriptions avec Authorization: Bearer ou X-Api-Key", async () => {
    expect((await get("/api/signups", { authorization: `Bearer ${KEY}` })).status).toBe(200);
    expect((await get("/api/signups", { "x-api-key": KEY })).status).toBe(200);
    expect((await get("/api/projects/all", { authorization: `Bearer ${KEY}` })).status).toBe(200);
  });

  it("passe l'authentification sur /api/crm (échoue ensuite faute de clé Airtable, jamais en 401)", async () => {
    const res = await get("/api/crm/contacts", { authorization: `Bearer ${KEY}` });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("refuse une clé fausse, absente ou tronquée", async () => {
    expect((await get("/api/signups", { authorization: "Bearer mauvaise-cle" })).status).toBe(401);
    expect((await get("/api/signups", { authorization: `Bearer ${KEY.slice(0, -1)}` })).status).toBe(401);
    expect((await get("/api/crm/contacts")).status).toBe(401);
    expect((await get("/api/crm/contacts", { authorization: "Basic abc" })).status).toBe(401);
  });

  it("ne donne PAS accès au compte admin, au profil, aux envois ni aux écritures sensibles", async () => {
    const h = { authorization: `Bearer ${KEY}`, "content-type": "application/json" };
    expect((await fetch(`${baseUrl}/api/auth/profile`, { method: "PATCH", headers: h, body: "{}" })).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/profile`, { method: "PUT", headers: h, body: "{}" })).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/email/send`, { method: "POST", headers: h, body: "{}" })).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/twilio/messages`, { method: "POST", headers: h, body: "{}" })).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/signups/x`, { method: "DELETE", headers: h })).status).toBe(401);
    expect((await get("/api/auth/me", { authorization: `Bearer ${KEY}` })).status).toBe(401);
  });

  it("mode lecture seule : les écritures sont refusées (403), les lectures passent", async () => {
    config.apiKey.readOnly = true;
    try {
      const h = { authorization: `Bearer ${KEY}`, "content-type": "application/json" };
      expect((await fetch(`${baseUrl}/api/crm/contacts`, { method: "POST", headers: h, body: "{}" })).status).toBe(403);
      expect((await get("/api/signups", { authorization: `Bearer ${KEY}` })).status).toBe(200);
    } finally {
      config.apiKey.readOnly = false;
    }
  });

  it("ignore une clé trop courte (32 caractères minimum) et la désactive sans clé configurée", async () => {
    const saved = config.apiKey.value;
    try {
      config.apiKey.value = "trop-courte";
      expect((await get("/api/signups", { authorization: "Bearer trop-courte" })).status).toBe(401);
      config.apiKey.value = "";
      expect((await get("/api/signups", { authorization: "Bearer " })).status).toBe(401);
    } finally {
      config.apiKey.value = saved;
    }
  });

  it("les inscriptions publiques (POST) restent ouvertes sans clé", async () => {
    const res = await fetch(`${baseUrl}/api/signups`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "a@b.fr" }) });
    expect([200, 201]).toContain(res.status);
  });
});
