import { AirtableTable, type AirtableRecord } from "./client.js";
import { linkIds } from "./mapping.js";

export type MessageChannel = "WhatsApp" | "SMS" | "Email" | "Téléphone" | "Site (formulaire)";
export type MessageDirection = "Entrant" | "Sortant";

interface MessageFields {
  "Sujet / Aperçu": string;
  Contact?: string[];
  Projet?: string[];
  Canal?: MessageChannel;
  Sens?: MessageDirection;
  Contenu?: string;
  Date?: string;
}

export interface CrmMessage {
  id: string;
  subject: string;
  contactIds: string[];
  projectIds: string[];
  channel: MessageChannel | null;
  direction: MessageDirection | null;
  content: string;
  date: string | null;
  createdTime: string;
}

export interface CrmMessageInput {
  subject: string;
  contactIds?: string[];
  projectIds?: string[];
  channel?: MessageChannel;
  direction?: MessageDirection;
  content?: string;
  date?: string;
}

const table = new AirtableTable<MessageFields>("Messages");

function fromRecord(r: AirtableRecord<MessageFields>): CrmMessage {
  return {
    id: r.id,
    subject: r.fields["Sujet / Aperçu"] ?? "",
    contactIds: linkIds(r.fields.Contact),
    projectIds: linkIds(r.fields.Projet),
    channel: r.fields.Canal ?? null,
    direction: r.fields.Sens ?? null,
    content: r.fields.Contenu ?? "",
    date: r.fields.Date ?? null,
    createdTime: r.createdTime,
  };
}

function toFields(input: Partial<CrmMessageInput>): Partial<MessageFields> {
  const fields: Partial<MessageFields> = {};
  if (input.subject !== undefined) fields["Sujet / Aperçu"] = input.subject;
  if (input.contactIds !== undefined) fields.Contact = input.contactIds;
  if (input.projectIds !== undefined) fields.Projet = input.projectIds;
  if (input.channel !== undefined) fields.Canal = input.channel;
  if (input.direction !== undefined) fields.Sens = input.direction;
  if (input.content !== undefined) fields.Contenu = input.content;
  if (input.date !== undefined) fields.Date = input.date;
  return fields;
}

export const messageRepo = {
  list: async () => (await table.list({ sort: [{ field: "Date", direction: "desc" }] })).map(fromRecord),
  get: async (id: string) => {
    const r = await table.get(id);
    return r ? fromRecord(r) : null;
  },
  create: async (input: CrmMessageInput) => fromRecord(await table.create(toFields(input))),
  update: async (id: string, patch: Partial<CrmMessageInput>) =>
    fromRecord(await table.update(id, toFields(patch))),
  remove: async (id: string) => table.remove(id),
};
