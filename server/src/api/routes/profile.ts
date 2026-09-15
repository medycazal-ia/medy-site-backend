import { Router } from "express";
import { profileStore } from "../../db.js";
import { requireAuth } from "../../services/authService.js";
import type { Profile } from "../../types.js";

export const profileRouter = Router();

// Public : lu par public-site/index.html pour afficher le profil.
profileRouter.get("/", (_req, res) => {
  res.json({ profile: profileStore.get() });
});

// Admin : seul Medy peut modifier son propre profil public.
profileRouter.put("/", requireAuth, (req, res) => {
  const body = req.body as Partial<Profile>;
  if (!body.firstName?.trim()) {
    return res.status(400).json({ error: "Le prénom est requis" });
  }
  if (!body.lastName?.trim()) {
    return res.status(400).json({ error: "Le nom est requis" });
  }
  if (!body.email?.trim()) {
    return res.status(400).json({ error: "L'email est requis" });
  }

  const profile = profileStore.update({
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    jobTitle: body.jobTitle?.trim() ?? "",
    email: body.email.trim(),
    phone: body.phone?.trim() ?? "",
    bio: body.bio?.trim() ?? "",
    siteTitle: body.siteTitle?.trim() || "Profil Connecté",
    photoUrl: body.photoUrl?.trim() ?? "",
  });
  res.json({ profile });
});
