import { Router } from "express";
import { messageRepo } from "../../airtable/messages.js";
import { sendEmail } from "../../email/client.js";
import { HttpError } from "../../httpError.js";

export const emailRouter = Router();

// Monté derrière requireAuth dans app.ts : seul Medy peut envoyer un email.
emailRouter.post("/send", async (req, res, next) => {
  try {
    const { to, subject, body, contactId, projectId } = req.body as {
      to?: string;
      subject?: string;
      body?: string;
      contactId?: string;
      projectId?: string;
    };
    if (!to?.trim() || !subject?.trim() || !body?.trim()) {
      throw new HttpError(400, "Destinataire, sujet et message requis");
    }

    await sendEmail(to.trim(), subject.trim(), body.trim());

    const message = await messageRepo.create({
      subject: subject.trim(),
      contactIds: contactId ? [contactId] : [],
      projectIds: projectId ? [projectId] : [],
      channel: "Email",
      direction: "Sortant",
      content: body.trim(),
      date: new Date().toISOString(),
    });

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});
