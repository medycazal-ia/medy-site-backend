import { AirtableTable, type AirtableAttachment, type AirtableRecord } from "./client.js";
import { linkIds, readAttachments, writeAttachments } from "./mapping.js";

export type ProposalStatus = "Brouillon" | "Envoyée" | "Acceptée" | "Refusée";

interface ProposalFields {
  Titre: string;
  Projet?: string[];
  Montant?: number;
  Statut?: ProposalStatus;
  "Date d'envoi"?: string;
  "Valable jusqu'au"?: string;
  Document?: unknown;
  Notes?: string;
}

export interface Proposal {
  id: string;
  title: string;
  projectIds: string[];
  amount: number | null;
  status: ProposalStatus | null;
  sentDate: string | null;
  validUntil: string | null;
  document: AirtableAttachment[];
  notes: string;
  createdTime: string;
}

export interface ProposalInput {
  title: string;
  projectIds?: string[];
  amount?: number;
  status?: ProposalStatus;
  sentDate?: string;
  validUntil?: string;
  document?: { url: string; filename?: string }[];
  notes?: string;
}

const table = new AirtableTable<ProposalFields>("Propositions commerciales");

function fromRecord(r: AirtableRecord<ProposalFields>): Proposal {
  return {
    id: r.id,
    title: r.fields.Titre ?? "",
    projectIds: linkIds(r.fields.Projet),
    amount: r.fields.Montant ?? null,
    status: r.fields.Statut ?? null,
    sentDate: r.fields["Date d'envoi"] ?? null,
    validUntil: r.fields["Valable jusqu'au"] ?? null,
    document: readAttachments(r.fields.Document),
    notes: r.fields.Notes ?? "",
    createdTime: r.createdTime,
  };
}

function toFields(input: Partial<ProposalInput>): Partial<ProposalFields> {
  const fields: Partial<ProposalFields> = {};
  if (input.title !== undefined) fields.Titre = input.title;
  if (input.projectIds !== undefined) fields.Projet = input.projectIds;
  if (input.amount !== undefined) fields.Montant = input.amount;
  if (input.status !== undefined) fields.Statut = input.status;
  if (input.sentDate !== undefined) fields["Date d'envoi"] = input.sentDate;
  if (input.validUntil !== undefined) fields["Valable jusqu'au"] = input.validUntil;
  if (input.document !== undefined) fields.Document = writeAttachments(input.document);
  if (input.notes !== undefined) fields.Notes = input.notes;
  return fields;
}

export const proposalRepo = {
  list: async () => (await table.list({ sort: [{ field: "Date d'envoi", direction: "desc" }] })).map(fromRecord),
  get: async (id: string) => {
    const r = await table.get(id);
    return r ? fromRecord(r) : null;
  },
  create: async (input: ProposalInput) => fromRecord(await table.create(toFields(input))),
  update: async (id: string, patch: Partial<ProposalInput>) =>
    fromRecord(await table.update(id, toFields(patch))),
  remove: async (id: string) => table.remove(id),
};
