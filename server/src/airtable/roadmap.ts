import { AirtableTable, type AirtableRecord } from "./client.js";
import { linkIds } from "./mapping.js";

export type RoadmapStepStatus = "À faire" | "En cours" | "Fait" | "Bloqué";

interface RoadmapStepFields {
  Étape: string;
  Projet?: string[];
  Description?: string;
  Échéance?: string;
  Statut?: RoadmapStepStatus;
  Ordre?: number;
}

export interface RoadmapStep {
  id: string;
  step: string;
  projectIds: string[];
  description: string;
  dueDate: string | null;
  status: RoadmapStepStatus | null;
  order: number;
  createdTime: string;
}

export interface RoadmapStepInput {
  step: string;
  projectIds?: string[];
  description?: string;
  dueDate?: string;
  status?: RoadmapStepStatus;
  order?: number;
}

const table = new AirtableTable<RoadmapStepFields>("Feuille de route");

function fromRecord(r: AirtableRecord<RoadmapStepFields>): RoadmapStep {
  return {
    id: r.id,
    step: r.fields.Étape ?? "",
    projectIds: linkIds(r.fields.Projet),
    description: r.fields.Description ?? "",
    dueDate: r.fields.Échéance ?? null,
    status: r.fields.Statut ?? null,
    order: r.fields.Ordre ?? 0,
    createdTime: r.createdTime,
  };
}

function toFields(input: Partial<RoadmapStepInput>): Partial<RoadmapStepFields> {
  const fields: Partial<RoadmapStepFields> = {};
  if (input.step !== undefined) fields.Étape = input.step;
  if (input.projectIds !== undefined) fields.Projet = input.projectIds;
  if (input.description !== undefined) fields.Description = input.description;
  if (input.dueDate !== undefined) fields.Échéance = input.dueDate;
  if (input.status !== undefined) fields.Statut = input.status;
  if (input.order !== undefined) fields.Ordre = input.order;
  return fields;
}

export const roadmapStepRepo = {
  list: async () => (await table.list({ sort: [{ field: "Ordre", direction: "asc" }] })).map(fromRecord),
  get: async (id: string) => {
    const r = await table.get(id);
    return r ? fromRecord(r) : null;
  },
  create: async (input: RoadmapStepInput) => fromRecord(await table.create(toFields(input))),
  update: async (id: string, patch: Partial<RoadmapStepInput>) =>
    fromRecord(await table.update(id, toFields(patch))),
  remove: async (id: string) => table.remove(id),
};
