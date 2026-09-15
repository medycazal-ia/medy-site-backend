import { config } from "../config.js";
import { HttpError } from "../httpError.js";

const AIRTABLE_API = "https://api.airtable.com/v0";

export interface AirtableAttachment {
  id?: string;
  url: string;
  filename?: string;
  size?: number;
  type?: string;
}

export interface AirtableRecord<F> {
  id: string;
  createdTime: string;
  fields: F;
}

export class AirtableError extends HttpError {
  constructor(status: number, body: string) {
    console.error(`[airtable] HTTP ${status}: ${body}`);
    super(502, "Airtable a renvoyé une erreur — voir les logs serveur");
  }
}

/** Client générique pour une table Airtable, typé par la forme de ses champs. */
export class AirtableTable<F extends object> {
  constructor(private readonly table: string) {}

  private headers(): Record<string, string> {
    if (!config.airtable.apiKey) {
      throw new HttpError(500, "AIRTABLE_API_KEY n'est pas configurée");
    }
    return {
      Authorization: `Bearer ${config.airtable.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private url(suffix = "", query?: URLSearchParams): string {
    const base = `${AIRTABLE_API}/${config.airtable.baseId}/${encodeURIComponent(this.table)}${suffix}`;
    return query ? `${base}?${query.toString()}` : base;
  }

  async list(options?: {
    filterByFormula?: string;
    sort?: { field: string; direction: "asc" | "desc" }[];
  }): Promise<AirtableRecord<F>[]> {
    const records: AirtableRecord<F>[] = [];
    let offset: string | undefined;

    do {
      const query = new URLSearchParams();
      if (options?.filterByFormula) query.set("filterByFormula", options.filterByFormula);
      options?.sort?.forEach((s, i) => {
        query.set(`sort[${i}][field]`, s.field);
        query.set(`sort[${i}][direction]`, s.direction);
      });
      if (offset) query.set("offset", offset);

      const res = await fetch(this.url("", query), { headers: this.headers() });
      if (!res.ok) throw new AirtableError(res.status, await res.text());
      const body = (await res.json()) as { records: AirtableRecord<F>[]; offset?: string };
      records.push(...body.records);
      offset = body.offset;
    } while (offset);

    return records;
  }

  async get(id: string): Promise<AirtableRecord<F> | null> {
    const res = await fetch(this.url(`/${id}`), { headers: this.headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new AirtableError(res.status, await res.text());
    return (await res.json()) as AirtableRecord<F>;
  }

  async create(fields: Partial<F>): Promise<AirtableRecord<F>> {
    const res = await fetch(this.url(), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) throw new AirtableError(res.status, await res.text());
    return (await res.json()) as AirtableRecord<F>;
  }

  async update(id: string, fields: Partial<F>): Promise<AirtableRecord<F>> {
    const res = await fetch(this.url(`/${id}`), {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) throw new AirtableError(res.status, await res.text());
    return (await res.json()) as AirtableRecord<F>;
  }

  async remove(id: string): Promise<void> {
    const res = await fetch(this.url(`/${id}`), { method: "DELETE", headers: this.headers() });
    if (!res.ok) throw new AirtableError(res.status, await res.text());
  }
}
