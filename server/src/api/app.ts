import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { HttpError } from "../httpError.js";
import { requireAuth } from "../services/authService.js";
import { authRouter } from "./routes/auth.js";
import { crmRouter } from "./routes/crm.js";
import { projectsRouter } from "./routes/projects.js";
import { signupsRouter } from "./routes/signups.js";
import { twilioRouter } from "./routes/twilio.js";

// server/dist/api/app.js -> repo root, pour retrouver le build statique de l'admin.
const here = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(here, "../../../web/dist");

export function createApp() {
  const app = express();
  // CORS ouvert : /api/projects (GET) et /api/signups (POST) sont appelés
  // depuis medy.site, un domaine différent (Canva Sites). Les routes admin
  // sont protégées par cookie de session, servies same-origin en prod.
  app.use(cors());
  app.use(express.json());
  // Twilio poste ses webhooks en application/x-www-form-urlencoded, jamais en JSON.
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/config", (_req, res) => res.json({ branding: config.branding }));
  app.use("/api/auth", authRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/signups", signupsRouter);
  // Données clients (CRM, Airtable) : jamais publiques, tout le routeur est protégé.
  app.use("/api/crm", requireAuth, crmRouter);
  // Mixte : /messages et /call exigent une session admin (déclaré route par
  // route dans twilioRouter) ; /voice/connect et /inbound sont les webhooks
  // publics de Twilio, protégés par vérification de signature à la place.
  app.use("/api/twilio", twilioRouter);

  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(webDist, "index.html"));
    });
  }

  // Doit rester après toutes les routes : convertit les erreurs (Airtable,
  // validation) en réponses JSON propres au lieu de laisser Express planter.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  });

  return app;
}
