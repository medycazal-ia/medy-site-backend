import { Router } from "express";
import { contactRepo } from "../../airtable/contacts.js";
import { messageRepo, type MessageChannel as CrmMessageChannel } from "../../airtable/messages.js";
import { HttpError } from "../../httpError.js";
import { requireAuth } from "../../services/authService.js";
import { initiateClickToCall, sendMessage, type MessageChannel } from "../../twilio/client.js";
import { verifyTwilioSignature } from "../../twilio/verifySignature.js";

export const twilioRouter = Router();

// --- Envoi (admin uniquement) -----------------------------------------

twilioRouter.post("/messages", requireAuth, async (req, res, next) => {
  try {
    const { channel, to, body, contactId, projectId } = req.body as {
      channel?: MessageChannel;
      to?: string;
      body?: string;
      contactId?: string;
      projectId?: string;
    };
    if (channel !== "sms" && channel !== "whatsapp") {
      throw new HttpError(400, 'Le canal doit être "sms" ou "whatsapp"');
    }
    if (!to?.trim() || !body?.trim()) {
      throw new HttpError(400, "Destinataire et message requis");
    }

    await sendMessage(channel, to.trim(), body.trim());

    const crmChannel: CrmMessageChannel = channel === "whatsapp" ? "WhatsApp" : "SMS";
    const message = await messageRepo.create({
      subject: body.trim().slice(0, 60),
      contactIds: contactId ? [contactId] : [],
      projectIds: projectId ? [projectId] : [],
      channel: crmChannel,
      direction: "Sortant",
      content: body.trim(),
      date: new Date().toISOString(),
    });

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

twilioRouter.post("/call", requireAuth, async (req, res, next) => {
  try {
    const { to, contactId, projectId } = req.body as {
      to?: string;
      contactId?: string;
      projectId?: string;
    };
    if (!to?.trim()) {
      throw new HttpError(400, "Numéro à appeler requis");
    }

    const call = await initiateClickToCall(to.trim());

    await messageRepo.create({
      subject: `Appel vers ${to.trim()}`,
      contactIds: contactId ? [contactId] : [],
      projectIds: projectId ? [projectId] : [],
      channel: "Téléphone",
      direction: "Sortant",
      content: `Appel initié (Twilio sid: ${call.sid})`,
      date: new Date().toISOString(),
    });

    res.status(201).json({ callSid: call.sid, status: call.status });
  } catch (err) {
    next(err);
  }
});

// --- Webhooks Twilio (publics, signature vérifiée) ---------------------

twilioRouter.post("/voice/connect", verifyTwilioSignature, (req, res) => {
  const to = typeof req.query.to === "string" ? req.query.to : "";
  res.type("text/xml");
  if (!to) {
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Say language="fr-FR">Numéro manquant.</Say></Response>');
    return;
  }
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Dial>${to}</Dial></Response>`
  );
});

twilioRouter.post("/inbound", verifyTwilioSignature, async (req, res, next) => {
  try {
    const from = String(req.body.From ?? "");
    const body = String(req.body.Body ?? "");
    const isWhatsApp = from.startsWith("whatsapp:");
    const rawFrom = from.replace(/^whatsapp:/, "");

    const contact = rawFrom ? await contactRepo.findByPhone(rawFrom) : null;

    await messageRepo.create({
      subject: body.slice(0, 60) || "(message vide)",
      contactIds: contact ? [contact.id] : [],
      channel: isWhatsApp ? "WhatsApp" : "SMS",
      direction: "Entrant",
      content: body,
      date: new Date().toISOString(),
    });

    res.type("text/xml").send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (err) {
    next(err);
  }
});
