import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let baseUrl: string;
let server: Server;
let cookie: string;

function extractCookie(res: Response): string {
  const raw = res.headers.get("set-cookie");
  if (!raw) throw new Error("Pas de Set-Cookie dans la réponse");
  return raw.split(";")[0];
}

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "msb-test-"));
  process.env.DATA_DIR = tmpDir;
  process.env.ADMINS_PATH = path.join(tmpDir, "admins.json");
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "bootstrap-pass-123";
  process.env.SESSION_SECRET = "test-session-secret";
  // Volontairement pas de RESEND_API_KEY : ce test vérifie les gardes d'accès,
  // pas un envoi réel (aucune clé Resend disponible dans cet environnement).

  const { createApp } = await import("../src/api/app.js");
  const { ensureBootstrapAdmin } = await import("../src/services/authService.js");
  ensureBootstrapAdmin();

  const app = createApp();
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "bootstrap-pass-123" }),
  });
  cookie = extractCookie(loginRes);
});

afterAll(() => {
  server.close();
});

describe("email", () => {
  it("refuse l'envoi sans session admin", async () => {
    const res = await fetch(`${baseUrl}/api/email/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "test@example.com", subject: "Bonjour", body: "Salut" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejette une requête incomplète", async () => {
    const res = await fetch(`${baseUrl}/api/email/send`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ to: "test@example.com" }),
    });
    expect(res.status).toBe(400);
  });

  it("répond une erreur explicite sans RESEND_API_KEY configurée", async () => {
    const res = await fetch(`${baseUrl}/api/email/send`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ to: "test@example.com", subject: "Bonjour", body: "Salut" }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/RESEND_API_KEY/);
  });
});
