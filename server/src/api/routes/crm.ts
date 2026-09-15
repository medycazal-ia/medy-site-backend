import { Router } from "express";
import { auditRepo } from "../../airtable/audits.js";
import { clientProjectRepo } from "../../airtable/clientProjects.js";
import { companyRepo } from "../../airtable/companies.js";
import { contactRepo } from "../../airtable/contacts.js";
import { createCrudRouter } from "../../airtable/crudRouter.js";
import { meetingRepo } from "../../airtable/meetings.js";
import { messageRepo } from "../../airtable/messages.js";
import { paymentRepo } from "../../airtable/payments.js";
import { proposalRepo } from "../../airtable/proposals.js";
import { roadmapStepRepo } from "../../airtable/roadmap.js";

// Toutes les données CRM (clients, projets, RDV, ...) vivent dans Airtable,
// jamais en JSON local — voir server/src/airtable/. Ce routeur entier est
// monté derrière requireAuth dans app.ts : aucune donnée client n'est publique.
export const crmRouter = Router();

crmRouter.use("/companies", createCrudRouter(companyRepo, "company", "companies"));
crmRouter.use("/contacts", createCrudRouter(contactRepo, "contact", "contacts"));
crmRouter.use("/projects", createCrudRouter(clientProjectRepo, "project", "projects"));
crmRouter.use("/meetings", createCrudRouter(meetingRepo, "meeting", "meetings"));
crmRouter.use("/audits", createCrudRouter(auditRepo, "audit", "audits"));
crmRouter.use("/proposals", createCrudRouter(proposalRepo, "proposal", "proposals"));
crmRouter.use("/payments", createCrudRouter(paymentRepo, "payment", "payments"));
crmRouter.use("/roadmap", createCrudRouter(roadmapStepRepo, "step", "steps"));
crmRouter.use("/messages", createCrudRouter(messageRepo, "message", "messages"));
