import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { validateRequest } from "./client.js";

/**
 * Vérifie qu'une requête webhook vient bien de Twilio (en-tête X-Twilio-Signature)
 * avant de la traiter — indispensable, ces routes sont forcément publiques
 * (Twilio ne peut pas envoyer de cookie de session).
 */
export function verifyTwilioSignature(req: Request, res: Response, next: NextFunction): void {
  if (!config.twilio.authToken || !config.twilio.publicBaseUrl) {
    res.status(500).send("Twilio non configuré");
    return;
  }

  const signature = req.header("X-Twilio-Signature");
  const url = `${config.twilio.publicBaseUrl}${req.originalUrl}`;

  if (!signature || !validateRequest(config.twilio.authToken, signature, url, req.body ?? {})) {
    res.status(403).send("Signature Twilio invalide");
    return;
  }

  next();
}
