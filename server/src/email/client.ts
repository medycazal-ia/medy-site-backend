import { config } from "../config.js";
import { HttpError } from "../httpError.js";

const RESEND_API = "https://api.resend.com/emails";

/** Envoie un email via l'API Resend. */
export async function sendEmail(to: string, subject: string, text: string): Promise<{ id: string }> {
  if (!config.email.resendApiKey) {
    throw new HttpError(500, "RESEND_API_KEY n'est pas configurée");
  }
  if (!config.email.from) {
    throw new HttpError(500, "EMAIL_FROM n'est pas configuré");
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.email.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: config.email.from, to: [to], subject, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[resend] HTTP ${res.status}: ${body}`);
    throw new HttpError(502, "Resend a renvoyé une erreur — voir les logs serveur");
  }
  return (await res.json()) as { id: string };
}
