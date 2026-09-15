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
  // Volontairement pas de TWILIO_* : ce test vérifie les gardes d'accès,
  // pas un envoi réel (aucune clé Twilio disponible dans cet environnement).

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

describe("twilio", () => {
  it("refuse l'envoi de message sans session admin", async () => {
    const res = await fetch(`${baseUrl}/api/twilio/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "sms", to: "+33612345678", body: "Bonjour" }),
    });
    expect(res.status).toBe(401);
  });

  it("refuse le clic-pour-appeler sans session admin", async () => {
    const res = await fetch(`${baseUrl}/api/twilio/call`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "+33612345678" }),
    });
    expect(res.status).toBe(401);
  });

  it("refuse un webhook entrant sans en-tête de signature Twilio", async () => {
    const res = await fetch(`${baseUrl}/api/twilio/inbound`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: "+33612345678", Body: "Salut" }).toString(),
    });
    // Sans TWILIO_AUTH_TOKEN / PUBLIC_BASE_URL configurés, la route répond 500
    // ("Twilio non configuré") plutôt que de tenter une vérification impossible.
    expect(res.status).toBe(500);
  });

  it("refuse un TwiML de connexion vocale sans signature valide", async () => {
    const res = await fetch(`${baseUrl}/api/twilio/voice/connect?to=%2B33612345678`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "",
    });
    expect(res.status).toBe(500);
  });
});
