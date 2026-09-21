import crypto from "node:crypto";
import { Router } from "express";
import { boiteSecreteStore } from "../../db.js";
import { requireAuth } from "../../services/authService.js";

export const boiteSecreteRouter = Router();

// Public : lu par public-site/boite-secrete.html pour vérifier le code saisi
// côté client (crypto.subtle.digest, comparé à ce hash) — jamais le code en
// clair, ni ici ni dans le fichier stocké côté serveur.
boiteSecreteRouter.get("/", (_req, res) => {
  const { codeHash, updatedAt } = boiteSecreteStore.get();
  res.json({ codeHash, updatedAt });
});

// Admin : c'est le mécanisme de "réinitialisation" — si Medy oublie le code
// de la boîte secrète, il reste connecté à cet admin (mot de passe séparé,
// récupérable via les variables d'env Render) pour en fixer un nouveau.
boiteSecreteRouter.put("/", requireAuth, (req, res) => {
  const body = req.body as { code?: string };
  const code = body.code?.trim();
  if (!code || code.length < 4) {
    return res.status(400).json({ error: "Le code doit contenir au moins 4 caractères" });
  }

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const updated = boiteSecreteStore.update(codeHash);
  res.json({ updatedAt: updated.updatedAt });
});
