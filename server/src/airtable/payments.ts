import { AirtableTable, type AirtableRecord } from "./client.js";
import { linkIds } from "./mapping.js";

export type PaymentStatus = "À venir" | "Payé" | "En retard";
export type PaymentMethod = "Virement" | "Carte" | "Chèque" | "Autre";

interface PaymentFields {
  Libellé: string;
  Projet?: string[];
  Montant?: number;
  "Date d'échéance"?: string;
  Statut?: PaymentStatus;
  "Date de paiement"?: string;
  Méthode?: PaymentMethod;
}

export interface Payment {
  id: string;
  label: string;
  projectIds: string[];
  amount: number | null;
  dueDate: string | null;
  status: PaymentStatus | null;
  paidDate: string | null;
  method: PaymentMethod | null;
  createdTime: string;
}

export interface PaymentInput {
  label: string;
  projectIds?: string[];
  amount?: number;
  dueDate?: string;
  status?: PaymentStatus;
  paidDate?: string;
  method?: PaymentMethod;
}

const table = new AirtableTable<PaymentFields>("Paiements");

function fromRecord(r: AirtableRecord<PaymentFields>): Payment {
  return {
    id: r.id,
    label: r.fields.Libellé ?? "",
    projectIds: linkIds(r.fields.Projet),
    amount: r.fields.Montant ?? null,
    dueDate: r.fields["Date d'échéance"] ?? null,
    status: r.fields.Statut ?? null,
    paidDate: r.fields["Date de paiement"] ?? null,
    method: r.fields.Méthode ?? null,
    createdTime: r.createdTime,
  };
}

function toFields(input: Partial<PaymentInput>): Partial<PaymentFields> {
  const fields: Partial<PaymentFields> = {};
  if (input.label !== undefined) fields.Libellé = input.label;
  if (input.projectIds !== undefined) fields.Projet = input.projectIds;
  if (input.amount !== undefined) fields.Montant = input.amount;
  if (input.dueDate !== undefined) fields["Date d'échéance"] = input.dueDate;
  if (input.status !== undefined) fields.Statut = input.status;
  if (input.paidDate !== undefined) fields["Date de paiement"] = input.paidDate;
  if (input.method !== undefined) fields.Méthode = input.method;
  return fields;
}

export const paymentRepo = {
  list: async () =>
    (await table.list({ sort: [{ field: "Date d'échéance", direction: "asc" }] })).map(fromRecord),
  get: async (id: string) => {
    const r = await table.get(id);
    return r ? fromRecord(r) : null;
  },
  create: async (input: PaymentInput) => fromRecord(await table.create(toFields(input))),
  update: async (id: string, patch: Partial<PaymentInput>) =>
    fromRecord(await table.update(id, toFields(patch))),
  remove: async (id: string) => table.remove(id),
};
