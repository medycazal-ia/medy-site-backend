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
  process.env.PROFILE_PATH = path.join(tmpDir, "profile.json");
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

describe("profile", () => {
  it("expose le profil par défaut, publiquement", async () => {
    const res = await fetch(`${baseUrl}/api/profile`);
    expect(res.status).toBe(200);
    const { profile } = await res.json();
    expect(profile.firstName).toBe("Medy");
    expect(profile.email).toBe("cazal@medy.site");
  });

  it("refuse la modification sans authentification", async () => {
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName: "Intrus", lastName: "X", email: "x@example.com" }),
    });
    expect(res.status).toBe(401);
  });

  it("met à jour le profil et le renvoie ensuite publiquement", async () => {
    const putRes = await fetch(`${baseUrl}/api/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        firstName: "Medy",
        lastName: "CAZAL",
        jobTitle: "Nouveau titre",
        email: "cazal@medy.site",
        phone: "06 00 00 00 00",
        bio: "Nouvelle bio",
        siteTitle: "Profil Connecté",
        photoUrl: "",
      }),
    });
    expect(putRes.status).toBe(200);
    const { profile } = await putRes.json();
    expect(profile.jobTitle).toBe("Nouveau titre");

    const publicRes = await fetch(`${baseUrl}/api/profile`);
    const { profile: publicProfile } = await publicRes.json();
    expect(publicProfile.jobTitle).toBe("Nouveau titre");
    expect(publicProfile.bio).toBe("Nouvelle bio");
  });

  it("rejette un profil sans prénom/nom/email", async () => {
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ firstName: "", lastName: "CAZAL", email: "cazal@medy.site" }),
    });
    expect(res.status).toBe(400);
  });
});
