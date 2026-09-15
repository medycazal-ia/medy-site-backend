import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { signupsRouter } from "./routes/signups.js";

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
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/config", (_req, res) => res.json({ branding: config.branding }));
  app.use("/api/auth", authRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/signups", signupsRouter);

  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(webDist, "index.html"));
    });
  }

  return app;
}
