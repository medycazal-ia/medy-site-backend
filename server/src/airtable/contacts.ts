import { AirtableTable, type AirtableRecord } from "./client.js";
import { linkIds, samePhoneNumber } from "./mapping.js";

interface ContactFields {
  "Nom complet": string;
  Email?: string;
  Téléphone?: string;
  Poste?: string;
  Entreprise?: string[];
  Notes?: string;
}

export interface Contact {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  companyIds: string[];
  notes: string;
  createdTime: string;
}

export interface ContactInput {
  fullName: string;
  email?: string;
  phone?: string;
  role?: string;
  companyIds?: string[];
  notes?: string;
}

const table = new AirtableTable<ContactFields>("Contacts");

function fromRecord(r: AirtableRecord<ContactFields>): Contact {
  return {
    id: r.id,
    fullName: r.fields["Nom complet"] ?? "",
    email: r.fields.Email ?? "",
    phone: r.fields.Téléphone ?? "",
    role: r.fields.Poste ?? "",
    companyIds: linkIds(r.fields.Entreprise),
    notes: r.fields.Notes ?? "",
    createdTime: r.createdTime,
  };
}

function toFields(input: Partial<ContactInput>): Partial<ContactFields> {
  const fields: Partial<ContactFields> = {};
  if (input.fullName !== undefined) fields["Nom complet"] = input.fullName;
  if (input.email !== undefined) fields.Email = input.email;
  if (input.phone !== undefined) fields.Téléphone = input.phone;
  if (input.role !== undefined) fields.Poste = input.role;
  if (input.companyIds !== undefined) fields.Entreprise = input.companyIds;
  if (input.notes !== undefined) fields.Notes = input.notes;
  return fields;
}

export const contactRepo = {
  list: async () => (await table.list({ sort: [{ field: "Nom complet", direction: "asc" }] })).map(fromRecord),
  get: async (id: string) => {
    const r = await table.get(id);
    return r ? fromRecord(r) : null;
  },
  create: async (input: ContactInput) => fromRecord(await table.create(toFields(input))),
  update: async (id: string, patch: Partial<ContactInput>) =>
    fromRecord(await table.update(id, toFields(patch))),
  remove: async (id: string) => table.remove(id),

  /** Rapproche un numéro entrant (webhook Twilio) d'un contact existant. */
  findByPhone: async (phone: string): Promise<Contact | null> => {
    const all = (await table.list()).map(fromRecord);
    return all.find((c) => c.phone && samePhoneNumber(c.phone, phone)) ?? null;
  },
};
