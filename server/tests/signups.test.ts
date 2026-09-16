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
  process.env.PROJECTS_PATH = path.join(tmpDir, "projects.json");
  process.env.SIGNUPS_PATH = path.join(tmpDir, "signups.json");
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "bootstrap-pass-123";
  process.env.SESSION_SECRET = "test-session-secret";

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

describe("signups", () => {
  it("refuse une adresse email invalide", async () => {
    const res = await fetch(`${baseUrl}/api/signups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "pas-un-email" }),
    });
    expect(res.status).toBe(400);
  });

  it("enregistre une inscription publique puis la liste en admin", async () => {
    const res = await fetch(`${baseUrl}/api/signups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "visiteur@example.com", source: "header" }),
    });
    expect(res.status).toBe(201);

    const listRes = await fetch(`${baseUrl}/api/signups`, { headers: { cookie } });
    expect(listRes.status).toBe(200);
    const { signups } = await listRes.json();
    expect(signups.some((s: { email: string }) => s.email === "visiteur@example.com")).toBe(true);
  });

  it("accepte un nom optionnel (création manuelle depuis l'admin)", async () => {
    const res = await fetch(`${baseUrl}/api/signups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "nommee@example.com", name: "Jeanne Dupont", source: "admin" }),
    });
    expect(res.status).toBe(201);
    const { signup } = await res.json();
    expect(signup.name).toBe("Jeanne Dupont");
  });

  it("ne duplique pas une inscription déjà connue", async () => {
    await fetch(`${baseUrl}/api/signups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "double@example.com" }),
    });
    const secondRes = await fetch(`${baseUrl}/api/signups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "double@example.com" }),
    });
    expect(secondRes.status).toBe(200);
    const body = await secondRes.json();
    expect(body.alreadyRegistered).toBe(true);
  });

  it("cache la liste des inscriptions aux visiteurs non authentifiés", async () => {
    const res = await fetch(`${baseUrl}/api/signups`);
    expect(res.status).toBe(401);
  });
});
