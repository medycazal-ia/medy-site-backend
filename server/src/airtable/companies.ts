import { AirtableTable, type AirtableRecord } from "./client.js";

interface CompanyFields {
  "Nom de l'entreprise": string;
  SIRET?: string;
  "Secteur d'activité"?: string;
  Adresse?: string;
  Ville?: string;
  "Code postal"?: string;
  "Site web"?: string;
  Notes?: string;
}

export interface Company {
  id: string;
  name: string;
  siret: string;
  sector: string;
  address: string;
  city: string;
  postalCode: string;
  website: string;
  notes: string;
  createdTime: string;
}

export interface CompanyInput {
  name: string;
  siret?: string;
  sector?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  website?: string;
  notes?: string;
}

const table = new AirtableTable<CompanyFields>("Entreprises");

function fromRecord(r: AirtableRecord<CompanyFields>): Company {
  return {
    id: r.id,
    name: r.fields["Nom de l'entreprise"] ?? "",
    siret: r.fields.SIRET ?? "",
    sector: r.fields["Secteur d'activité"] ?? "",
    address: r.fields.Adresse ?? "",
    city: r.fields.Ville ?? "",
    postalCode: r.fields["Code postal"] ?? "",
    website: r.fields["Site web"] ?? "",
    notes: r.fields.Notes ?? "",
    createdTime: r.createdTime,
  };
}

function toFields(input: Partial<CompanyInput>): Partial<CompanyFields> {
  const fields: Partial<CompanyFields> = {};
  if (input.name !== undefined) fields["Nom de l'entreprise"] = input.name;
  if (input.siret !== undefined) fields.SIRET = input.siret;
  if (input.sector !== undefined) fields["Secteur d'activité"] = input.sector;
  if (input.address !== undefined) fields.Adresse = input.address;
  if (input.city !== undefined) fields.Ville = input.city;
  if (input.postalCode !== undefined) fields["Code postal"] = input.postalCode;
  if (input.website !== undefined) fields["Site web"] = input.website;
  if (input.notes !== undefined) fields.Notes = input.notes;
  return fields;
}

export const companyRepo = {
  list: async () =>
    (await table.list({ sort: [{ field: "Nom de l'entreprise", direction: "asc" }] })).map(fromRecord),
  get: async (id: string) => {
    const r = await table.get(id);
    return r ? fromRecord(r) : null;
  },
  create: async (input: CompanyInput) => fromRecord(await table.create(toFields(input))),
  update: async (id: string, patch: Partial<CompanyInput>) =>
    fromRecord(await table.update(id, toFields(patch))),
  remove: async (id: string) => table.remove(id),
};
