import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { adminStore } from "../db.js";
import type { Admin, PublicAdmin } from "../types.js";

export const SESSION_COOKIE = "ms_session";

function hmac(payload: string): string {
  return crypto.createHmac("sha256", config.auth.sessionSecret).update(payload).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

export function toPublicAdmin(admin: Admin): PublicAdmin {
  const { passwordHash: _passwordHash, ...publicAdmin } = admin;
  return publicAdmin;
}

/** Crée le tout premier compte au démarrage, à partir de ADMIN_USERNAME/ADMIN_PASSWORD. */
export function ensureBootstrapAdmin(): void {
  if (adminStore.list().length > 0) return;

  if (!config.auth.password || !config.auth.sessionSecret) {
    throw new Error(
      "ADMIN_PASSWORD et SESSION_SECRET doivent être définis pour le premier démarrage."
    );
  }

  adminStore.add({
    id: crypto.randomUUID(),
    username: config.auth.username,
    passwordHash: hashPassword(config.auth.password),
    createdAt: new Date().toISOString(),
  });
  console.log(`[auth] compte initial créé (${config.auth.username})`);
}

export function checkCredentials(username: string, password: string): Admin | null {
  if (!config.auth.sessionSecret) {
    throw new Error("SESSION_SECRET doit être défini pour activer la connexion");
  }
  const admin = adminStore.findByUsername(username);
  if (!admin || !verifyPassword(password, admin.passwordHash)) return null;
  return admin;
}

export function createSessionToken(adminId: string): string {
  const expiresAt = Date.now() + config.auth.sessionTtlMs;
  const payload = `${adminId}.${expiresAt}`;
  return `${payload}.${hmac(payload)}`;
}

export function verifySessionToken(token: string | undefined): { adminId: string } | null {
  if (!token || !config.auth.sessionSecret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [adminId, expiresAtRaw, signature] = parts;
  const payload = `${adminId}.${expiresAtRaw}`;

  let expected: string;
  try {
    expected = hmac(payload);
  } catch {
    return null;
  }
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return { adminId };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = verifySessionToken(req.cookies?.[SESSION_COOKIE]);
  const admin = session ? adminStore.findById(session.adminId) : undefined;
  if (!admin) {
    res.status(401).json({ error: "Authentification requise" });
    return;
  }
  req.admin = { id: admin.id, username: admin.username };
  next();
}
