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

describe("projects", () => {
  it("expose le projet tierspayant.site par défaut, publiquement", async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projects.some((p: { title: string }) => p.title === "tierspayant.site")).toBe(true);
  });

  it("masque les projets en brouillon de la liste publique", async () => {
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title: "Nouveau projet", url: "https://example.com", status: "draft" }),
    });
    expect(createRes.status).toBe(201);
    const { project } = await createRes.json();

    const publicRes = await fetch(`${baseUrl}/api/projects`);
    const { projects } = await publicRes.json();
    expect(projects.some((p: { id: string }) => p.id === project.id)).toBe(false);

    const allRes = await fetch(`${baseUrl}/api/projects/all`, { headers: { cookie } });
    const { projects: allProjects } = await allRes.json();
    expect(allProjects.some((p: { id: string }) => p.id === project.id)).toBe(true);
  });

  it("met à jour puis supprime un projet", async () => {
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title: "À modifier", url: "https://example.com", status: "soon" }),
    });
    const { project } = await createRes.json();

    const patchRes = await fetch(`${baseUrl}/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ status: "live" }),
    });
    expect(patchRes.status).toBe(200);
    const { project: updated } = await patchRes.json();
    expect(updated.status).toBe("live");

    const deleteRes = await fetch(`${baseUrl}/api/projects/${project.id}`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(deleteRes.status).toBe(204);
  });

  it("refuse la création/modification sans authentification", async () => {
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Intrus", url: "https://example.com" }),
    });
    expect(res.status).toBe(401);
  });
});
