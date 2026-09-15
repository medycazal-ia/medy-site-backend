import { AirtableTable, type AirtableAttachment, type AirtableRecord } from "./client.js";
import { linkIds, readAttachments, writeAttachments } from "./mapping.js";

export type ClientProjectStatus =
  | "Prospect"
  | "Audit en cours"
  | "Proposition envoyée"
  | "Signé"
  | "En cours"
  | "Terminé"
  | "Perdu";

interface ClientProjectFields {
  "Nom du projet": string;
  Entreprise?: string[];
  "Contact principal"?: string[];
  Description?: string;
  Budget?: number;
  Statut?: ClientProjectStatus;
  "Date de début"?: string;
  "Date de lancement cible"?: string;
  Images?: unknown;
  Vidéos?: unknown;
}

export interface ClientProject {
  id: string;
  name: string;
  companyIds: string[];
  contactIds: string[];
  description: string;
  budget: number | null;
  status: ClientProjectStatus | null;
  startDate: string | null;
  targetLaunchDate: string | null;
  images: AirtableAttachment[];
  videos: AirtableAttachment[];
  createdTime: string;
}

export interface ClientProjectInput {
  name: string;
  companyIds?: string[];
  contactIds?: string[];
  description?: string;
  budget?: number;
  status?: ClientProjectStatus;
  startDate?: string;
  targetLaunchDate?: string;
  images?: { url: string; filename?: string }[];
  videos?: { url: string; filename?: string }[];
}

const table = new AirtableTable<ClientProjectFields>("Projets");

function fromRecord(r: AirtableRecord<ClientProjectFields>): ClientProject {
  return {
    id: r.id,
    name: r.fields["Nom du projet"] ?? "",
    companyIds: linkIds(r.fields.Entreprise),
    contactIds: linkIds(r.fields["Contact principal"]),
    description: r.fields.Description ?? "",
    budget: r.fields.Budget ?? null,
    status: r.fields.Statut ?? null,
    startDate: r.fields["Date de début"] ?? null,
    targetLaunchDate: r.fields["Date de lancement cible"] ?? null,
    images: readAttachments(r.fields.Images),
    videos: readAttachments(r.fields.Vidéos),
    createdTime: r.createdTime,
  };
}

function toFields(input: Partial<ClientProjectInput>): Partial<ClientProjectFields> {
  const fields: Partial<ClientProjectFields> = {};
  if (input.name !== undefined) fields["Nom du projet"] = input.name;
  if (input.companyIds !== undefined) fields.Entreprise = input.companyIds;
  if (input.contactIds !== undefined) fields["Contact principal"] = input.contactIds;
  if (input.description !== undefined) fields.Description = input.description;
  if (input.budget !== undefined) fields.Budget = input.budget;
  if (input.status !== undefined) fields.Statut = input.status;
  if (input.startDate !== undefined) fields["Date de début"] = input.startDate;
  if (input.targetLaunchDate !== undefined) fields["Date de lancement cible"] = input.targetLaunchDate;
  if (input.images !== undefined) fields.Images = writeAttachments(input.images);
  if (input.videos !== undefined) fields.Vidéos = writeAttachments(input.videos);
  return fields;
}

export const clientProjectRepo = {
  list: async () => (await table.list({ sort: [{ field: "Nom du projet", direction: "asc" }] })).map(fromRecord),
  get: async (id: string) => {
    const r = await table.get(id);
    return r ? fromRecord(r) : null;
  },
  create: async (input: ClientProjectInput) => fromRecord(await table.create(toFields(input))),
  update: async (id: string, patch: Partial<ClientProjectInput>) =>
    fromRecord(await table.update(id, toFields(patch))),
  remove: async (id: string) => table.remove(id),
};
