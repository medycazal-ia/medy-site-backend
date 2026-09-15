import { AirtableTable, type AirtableAttachment, type AirtableRecord } from "./client.js";
import { linkIds, readAttachments, writeAttachments } from "./mapping.js";

export type MeetingType = "Audio" | "Visio" | "Téléphone" | "Présentiel";
export type MeetingStatus = "Planifié" | "Réalisé" | "Annulé";

interface MeetingFields {
  Titre: string;
  Projet?: string[];
  Contact?: string[];
  Type?: MeetingType;
  Date?: string;
  Statut?: MeetingStatus;
  Enregistrement?: unknown;
  Transcription?: string;
  "Compte-rendu"?: string;
}

export interface Meeting {
  id: string;
  title: string;
  projectIds: string[];
  contactIds: string[];
  type: MeetingType | null;
  date: string | null;
  status: MeetingStatus | null;
  recording: AirtableAttachment[];
  transcription: string;
  summary: string;
  createdTime: string;
}

export interface MeetingInput {
  title: string;
  projectIds?: string[];
  contactIds?: string[];
  type?: MeetingType;
  date?: string;
  status?: MeetingStatus;
  recording?: { url: string; filename?: string }[];
  transcription?: string;
  summary?: string;
}

const table = new AirtableTable<MeetingFields>("Rendez-vous");

function fromRecord(r: AirtableRecord<MeetingFields>): Meeting {
  return {
    id: r.id,
    title: r.fields.Titre ?? "",
    projectIds: linkIds(r.fields.Projet),
    contactIds: linkIds(r.fields.Contact),
    type: r.fields.Type ?? null,
    date: r.fields.Date ?? null,
    status: r.fields.Statut ?? null,
    recording: readAttachments(r.fields.Enregistrement),
    transcription: r.fields.Transcription ?? "",
    summary: r.fields["Compte-rendu"] ?? "",
    createdTime: r.createdTime,
  };
}

function toFields(input: Partial<MeetingInput>): Partial<MeetingFields> {
  const fields: Partial<MeetingFields> = {};
  if (input.title !== undefined) fields.Titre = input.title;
  if (input.projectIds !== undefined) fields.Projet = input.projectIds;
  if (input.contactIds !== undefined) fields.Contact = input.contactIds;
  if (input.type !== undefined) fields.Type = input.type;
  if (input.date !== undefined) fields.Date = input.date;
  if (input.status !== undefined) fields.Statut = input.status;
  if (input.recording !== undefined) fields.Enregistrement = writeAttachments(input.recording);
  if (input.transcription !== undefined) fields.Transcription = input.transcription;
  if (input.summary !== undefined) fields["Compte-rendu"] = input.summary;
  return fields;
}

export const meetingRepo = {
  list: async () => (await table.list({ sort: [{ field: "Date", direction: "desc" }] })).map(fromRecord),
  get: async (id: string) => {
    const r = await table.get(id);
    return r ? fromRecord(r) : null;
  },
  create: async (input: MeetingInput) => fromRecord(await table.create(toFields(input))),
  update: async (id: string, patch: Partial<MeetingInput>) =>
    fromRecord(await table.update(id, toFields(patch))),
  remove: async (id: string) => table.remove(id),
};
