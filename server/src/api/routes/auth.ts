import { Router } from "express";
import { config } from "../../config.js";
import { adminStore } from "../../db.js";
import {
  SESSION_COOKIE,
  checkCredentials,
  createSessionToken,
  hashPassword,
  requireAuth,
  toPublicAdmin,
  verifyPassword,
  verifySessionToken,
} from "../../services/authService.js";

export const authRouter = Router();

function setSessionCookie(res: import("express").Response, adminId: string) {
  const token = createSessionToken(adminId);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: config.auth.sessionTtlMs,
  });
}

authRouter.post("/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ error: "Identifiant et mot de passe requis" });
  }

  let admin;
  try {
    admin = checkCredentials(username, password);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Erreur serveur" });
  }
  if (!admin) {
    return res.status(401).json({ error: "Identifiant ou mot de passe incorrect" });
  }

  setSessionCookie(res, admin.id);
  res.json({ ok: true, admin: toPublicAdmin(admin) });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  const session = verifySessionToken(req.cookies?.[SESSION_COOKIE]);
  const admin = session ? adminStore.findById(session.adminId) : undefined;
  if (!admin) return res.status(401).json({ error: "Non connecté" });
  res.json({ admin: toPublicAdmin(admin) });
});

authRouter.patch("/profile", requireAuth, (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body as {
    currentPassword?: string;
    newUsername?: string;
    newPassword?: string;
  };

  const admin = adminStore.findById(req.admin!.id)!;

  if (!currentPassword || !verifyPassword(currentPassword, admin.passwordHash)) {
    return res.status(401).json({ error: "Mot de passe actuel incorrect" });
  }

  if (newUsername && newUsername.trim() && newUsername.trim() !== admin.username) {
    const trimmed = newUsername.trim();
    if (adminStore.findByUsername(trimmed)) {
      return res.status(409).json({ error: "Cet identifiant est déjà utilisé" });
    }
    adminStore.update(admin.id, { username: trimmed });
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit faire au moins 8 caractères" });
    }
    adminStore.update(admin.id, { passwordHash: hashPassword(newPassword) });
  }

  const updated = adminStore.findById(admin.id)!;
  setSessionCookie(res, updated.id);
  res.json({ admin: toPublicAdmin(updated) });
});
