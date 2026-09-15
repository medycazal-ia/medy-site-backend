import twilioSdk from "twilio";
import { config } from "../config.js";
import { HttpError } from "../httpError.js";

export type MessageChannel = "sms" | "whatsapp";

let client: ReturnType<typeof twilioSdk> | null = null;

function getClient() {
  if (!config.twilio.accountSid || !config.twilio.authToken) {
    throw new HttpError(500, "Twilio n'est pas configuré (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN manquants)");
  }
  if (!client) {
    client = twilioSdk(config.twilio.accountSid, config.twilio.authToken);
  }
  return client;
}

/** Envoie un SMS ou un message WhatsApp via Twilio. */
export async function sendMessage(channel: MessageChannel, to: string, body: string) {
  const from = channel === "whatsapp" ? config.twilio.whatsappFrom : config.twilio.smsFrom;
  if (!from) {
    throw new HttpError(500, `Aucun expéditeur Twilio configuré pour le canal "${channel}"`);
  }
  return getClient().messages.create({
    from: channel === "whatsapp" ? `whatsapp:${from}` : from,
    to: channel === "whatsapp" ? `whatsapp:${to}` : to,
    body,
  });
}

/**
 * Clic-pour-appeler : Twilio appelle d'abord le téléphone de Medy
 * (TWILIO_MY_PHONE_NUMBER) puis, une fois décroché, relie l'appel au
 * numéro du client via la TwiML servie par /api/twilio/voice/connect.
 */
export async function initiateClickToCall(to: string) {
  if (!config.twilio.myPhoneNumber) {
    throw new HttpError(500, "TWILIO_MY_PHONE_NUMBER n'est pas configuré");
  }
  if (!config.twilio.smsFrom) {
    throw new HttpError(500, "TWILIO_SMS_FROM n'est pas configuré (utilisé comme numéro appelant)");
  }
  if (!config.twilio.publicBaseUrl) {
    throw new HttpError(500, "PUBLIC_BASE_URL n'est pas configuré (nécessaire pour que Twilio rappelle ce service)");
  }
  return getClient().calls.create({
    to: config.twilio.myPhoneNumber,
    from: config.twilio.smsFrom,
    url: `${config.twilio.publicBaseUrl}/api/twilio/voice/connect?to=${encodeURIComponent(to)}`,
  });
}

export { validateRequest } from "twilio";
