import crypto from "node:crypto";
import { Router } from "express";
import { signupStore } from "../../db.js";
import { requireAuth } from "../../services/authService.js";

export const signupsRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public : formulaire "S'inscrire" du site medy.site (et création manuelle
// depuis l'admin, qui appelle cette même route — pas de distinction de
// permission nécessaire, une inscription n'est jamais sensible).
signupsRouter.post("/", (req, res) => {
  const { email, name, source } = req.body as { email?: string; name?: string; source?: string };
  const trimmed = email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(trimmed)) {
    return res.status(400).json({ error: "Adresse email invalide" });
  }

  const existing = signupStore.findByEmail(trimmed);
  if (existing) {
    return res.status(200).json({ signup: existing, alreadyRegistered: true });
  }

  const signup = {
    id: crypto.randomUUID(),
    name: name?.trim() ?? "",
    email: trimmed,
    source: source?.trim() || "header",
    createdAt: new Date().toISOString(),
  };
  signupStore.add(signup);
  res.status(201).json({ signup });
});

// Admin : consultation des inscriptions.
signupsRouter.get("/", requireAuth, (_req, res) => {
  res.json({ signups: signupStore.list() });
});

signupsRouter.delete("/:id", requireAuth, (req, res) => {
  const removed = signupStore.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: "Inscription introuvable" });
  res.status(204).end();
});
