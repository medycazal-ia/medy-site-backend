import { AirtableTable, type AirtableAttachment, type AirtableRecord } from "./client.js";
import { linkIds, readAttachments, writeAttachments } from "./mapping.js";

interface AuditFields {
  Titre: string;
  Projet?: string[];
  Date?: string;
  Constats?: string;
  Recommandations?: string;
  Documents?: unknown;
}

export interface Audit {
  id: string;
  title: string;
  projectIds: string[];
  date: string | null;
  findings: string;
  recommendations: string;
  documents: AirtableAttachment[];
  createdTime: string;
}

export interface AuditInput {
  title: string;
  projectIds?: string[];
  date?: string;
  findings?: string;
  recommendations?: string;
  documents?: { url: string; filename?: string }[];
}

const table = new AirtableTable<AuditFields>("Audits");

function fromRecord(r: AirtableRecord<AuditFields>): Audit {
  return {
    id: r.id,
    title: r.fields.Titre ?? "",
    projectIds: linkIds(r.fields.Projet),
    date: r.fields.Date ?? null,
    findings: r.fields.Constats ?? "",
    recommendations: r.fields.Recommandations ?? "",
    documents: readAttachments(r.fields.Documents),
    createdTime: r.createdTime,
  };
}

function toFields(input: Partial<AuditInput>): Partial<AuditFields> {
  const fields: Partial<AuditFields> = {};
  if (input.title !== undefined) fields.Titre = input.title;
  if (input.projectIds !== undefined) fields.Projet = input.projectIds;
  if (input.date !== undefined) fields.Date = input.date;
  if (input.findings !== undefined) fields.Constats = input.findings;
  if (input.recommendations !== undefined) fields.Recommandations = input.recommendations;
  if (input.documents !== undefined) fields.Documents = writeAttachments(input.documents);
  return fields;
}

export const auditRepo = {
  list: async () => (await table.list({ sort: [{ field: "Date", direction: "desc" }] })).map(fromRecord),
  get: async (id: string) => {
    const r = await table.get(id);
    return r ? fromRecord(r) : null;
  },
  create: async (input: AuditInput) => fromRecord(await table.create(toFields(input))),
  update: async (id: string, patch: Partial<AuditInput>) =>
    fromRecord(await table.update(id, toFields(patch))),
  remove: async (id: string) => table.remove(id),
};
