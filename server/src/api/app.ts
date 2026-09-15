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

// server/dist/api/app.js -> repo root, pour retrouver les fichiers statiques.
const here = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(here, "../../../web/dist");
const publicSiteDir = path.resolve(here, "../../../public-site");

export function createApp() {
  const app = express();
  // CORS ouvert : historiquement nécessaire quand medy.site vivait sur Canva
  // (domaine différent) ; conservé même maintenant que medy.site et l'API
  // sont le même service, au cas où une autre origine appelle ces routes
  // publiques. Les routes admin restent protégées par cookie de session.
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

  // Un seul service, deux sites distincts selon le domaine de la requête :
  // medy.site (et www.medy.site) reçoit le site public statique
  // (public-site/, localStorage, aucun appel API) ; tout autre host —
  // medy-site-backend.onrender.com compris, utilisé par le clic caché du
  // logo — reçoit l'admin React (web/dist) comme avant.
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    const host = req.hostname;
    const isPublicSiteHost =
      host === config.publicSite.host || host === `www.${config.publicSite.host}`;
    if (isPublicSiteHost && fs.existsSync(publicSiteDir)) {
      return express.static(publicSiteDir)(req, res, () => {
        res.sendFile(path.join(publicSiteDir, "index.html"));
      });
    }
    next();
  });

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
