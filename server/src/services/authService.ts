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

// ---------------------------------------------------------------------------
// Clé d'API (Automator & co) — voir config.apiKey. Réservée aux routes qui
// utilisent requireSessionOrApiKey ; requireAuth (compte, profil, envois)
// reste strictement limité à la session admin.
// ---------------------------------------------------------------------------

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest();
const apiKeyFailures = new Map<string, { count: number; until: number }>();
const MAX_API_KEY_FAILURES = 10;
const API_KEY_LOCK_MS = 5 * 60 * 1000;
let warnedWeakKey = false;

function apiKeyEnabled(): boolean {
  const { value, minLength } = config.apiKey;
  if (!value) return false;
  if (value.length < minLength) {
    if (!warnedWeakKey) {
      warnedWeakKey = true;
      console.warn(`[auth] AUTOMATOR_API_KEY ignorée : ${minLength} caractères minimum.`);
    }
    return false;
  }
  return true;
}

function presentedApiKey(req: Request): string | undefined {
  const header = req.get("authorization");
  if (header && /^Bearer\s+/i.test(header)) return header.replace(/^Bearer\s+/i, "").trim();
  return req.get("x-api-key")?.trim() || undefined;
}

/** Session admin (cookie) OU clé d'API valide. */
export function requireSessionOrApiKey(req: Request, res: Response, next: NextFunction): void {
  const session = verifySessionToken(req.cookies?.[SESSION_COOKIE]);
  const admin = session ? adminStore.findById(session.adminId) : undefined;
  if (admin) {
    req.admin = { id: admin.id, username: admin.username };
    return next();
  }

  const key = presentedApiKey(req);
  if (key && apiKeyEnabled()) {
    if (crypto.timingSafeEqual(sha256(key), sha256(config.apiKey.value))) {
      // Une clé correcte passe toujours : le verrou ci-dessous ne vise que les essais erronés
      // (derrière le proxy de Render, req.ip peut être partagé — il ne doit pas bloquer le vrai client).
      if (config.apiKey.readOnly && !["GET", "HEAD"].includes(req.method)) {
        res.status(403).json({ error: "Clé d'API en lecture seule" });
        return;
      }
      req.admin = { id: "api-key", username: "api-key" };
      console.log(`[api-key] ${req.method} ${req.baseUrl}${req.path}`);
      return next();
    }
    const ip = req.ip ?? "?";
    const failures = apiKeyFailures.get(ip);
    if (failures && failures.until > Date.now()) {
      res.status(429).json({ error: "Trop de tentatives, réessayez plus tard" });
      return;
    }
    const count = (failures?.count ?? 0) + 1;
    apiKeyFailures.set(ip, count >= MAX_API_KEY_FAILURES ? { count: 0, until: Date.now() + API_KEY_LOCK_MS } : { count, until: 0 });
  }
  res.status(401).json({ error: "Authentification requise" });
}
