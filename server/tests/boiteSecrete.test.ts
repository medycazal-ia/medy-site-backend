import crypto from "node:crypto";
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

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "msb-test-"));
  process.env.DATA_DIR = tmpDir;
  process.env.ADMINS_PATH = path.join(tmpDir, "admins.json");
  process.env.BOITE_SECRETE_PATH = path.join(tmpDir, "boite-secrete.json");
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

describe("boite-secrete", () => {
  it("expose le hash par défaut, publiquement, jamais le code en clair", async () => {
    const res = await fetch(`${baseUrl}/api/boite-secrete`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.codeHash).toBe(sha256("MEDYOUTILS26"));
    expect(body.code).toBeUndefined();
  });

  it("refuse la modification sans authentification", async () => {
    const res = await fetch(`${baseUrl}/api/boite-secrete`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "NOUVEAUCODE" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejette un code trop court", async () => {
    const res = await fetch(`${baseUrl}/api/boite-secrete`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ code: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("met à jour le code et le hash public change en conséquence", async () => {
    const putRes = await fetch(`${baseUrl}/api/boite-secrete`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ code: "  NouveauCode2026  " }),
    });
    expect(putRes.status).toBe(200);

    const publicRes = await fetch(`${baseUrl}/api/boite-secrete`);
    const { codeHash } = await publicRes.json();
    expect(codeHash).toBe(sha256("NouveauCode2026"));
  });
});
