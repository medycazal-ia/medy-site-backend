import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..");

const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(serverRoot, "data"));

export const config = {
  port: Number(process.env.PORT ?? 4200),

  branding: {
    name: process.env.BRAND_NAME ?? "medy.site",
  },

  dataDir,
  adminsPath: path.resolve(process.env.ADMINS_PATH ?? path.join(dataDir, "admins.json")),
  projectsPath: path.resolve(process.env.PROJECTS_PATH ?? path.join(dataDir, "projects.json")),
  signupsPath: path.resolve(process.env.SIGNUPS_PATH ?? path.join(dataDir, "signups.json")),

  auth: {
    username: process.env.ADMIN_USERNAME ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "",
    sessionSecret: process.env.SESSION_SECRET ?? "",
    sessionTtlMs: 12 * 60 * 60 * 1000, // 12h
  },

  // CRM (gestion clients) : stocké dans Airtable plutôt qu'en JSON local,
  // voir server/src/airtable/. Base "Medy CRM — Clients & Projets".
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY ?? "",
    baseId: process.env.AIRTABLE_BASE_ID ?? "app2Zji7fTJLN9aAg",
  },

  // Messagerie/téléphonie (SMS, WhatsApp, clic-pour-appeler) — voir server/src/twilio/.
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    // Numéro Twilio pour SMS et pour émettre les appels (clic-pour-appeler).
    smsFrom: process.env.TWILIO_SMS_FROM ?? "",
    // Expéditeur WhatsApp Twilio, format E.164 sans le préfixe "whatsapp:"
    // (ex: le sandbox +14155238886, ou un numéro validé Meta Business).
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? "",
    // Le téléphone de Medy : pour le clic-pour-appeler, Twilio l'appelle
    // d'abord puis relie l'appel au client une fois décroché.
    myPhoneNumber: process.env.TWILIO_MY_PHONE_NUMBER ?? "",
    // URL publique de ce service (ex: https://medy-site-backend.onrender.com),
    // nécessaire pour que Twilio rappelle nos webhooks (TwiML, réception).
    // RENDER_EXTERNAL_URL est injecté automatiquement par Render sur chaque
    // service : sert de valeur par défaut si PUBLIC_BASE_URL n'est pas posé
    // explicitement. Inutilisable en local sans tunnel (ngrok).
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? "",
  },
};
