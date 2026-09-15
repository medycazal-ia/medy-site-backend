import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let baseUrl: string;
let server: Server;

beforeAll(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "msb-test-"));
  process.env.DATA_DIR = tmpDir;
  process.env.ADMINS_PATH = path.join(tmpDir, "admins.json");
  process.env.PROJECTS_PATH = path.join(tmpDir, "projects.json");
  process.env.SIGNUPS_PATH = path.join(tmpDir, "signups.json");
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "bootstrap-pass-123";
  process.env.SESSION_SECRET = "test-session-secret";
  // Volontairement pas d'AIRTABLE_API_KEY : ce test vérifie seulement que les
  // routes CRM exigent une session admin, avant même de toucher Airtable.

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
});

afterAll(() => {
  server.close();
});

describe("crm", () => {
  const resources = [
    "companies",
    "contacts",
    "projects",
    "meetings",
    "audits",
    "proposals",
    "payments",
    "roadmap",
    "messages",
  ];

  it.each(resources)("refuse l'accès à /api/crm/%s sans session admin", async (resource) => {
    const res = await fetch(`${baseUrl}/api/crm/${resource}`);
    expect(res.status).toBe(401);
  });
});
