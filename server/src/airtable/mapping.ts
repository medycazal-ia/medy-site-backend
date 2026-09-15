import type { AirtableAttachment } from "./client.js";

/** Champ Airtable "lien vers un autre tableau" : tableau d'IDs d'enregistrements liés. */
export function linkIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Champ Airtable "pièces jointes" en lecture : ne garde que ce dont l'API a besoin. */
export function readAttachments(value: unknown): AirtableAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.map((a: Record<string, unknown>) => ({
    id: typeof a.id === "string" ? a.id : undefined,
    url: String(a.url ?? ""),
    filename: typeof a.filename === "string" ? a.filename : undefined,
    size: typeof a.size === "number" ? a.size : undefined,
    type: typeof a.type === "string" ? a.type : undefined,
  }));
}

/**
 * Champ Airtable "pièces jointes" en écriture : Airtable télécharge le fichier depuis
 * chaque URL fournie. Pas d'upload de fichiers propre à cette API pour l'instant — le
 * client doit fournir une URL déjà hébergée (ex: lien partagé, pièce jointe email).
 */
/**
 * Compare deux numéros de téléphone en ignorant la mise en forme (espaces,
 * indicatif +33 vs 0 initial, etc.) : ne garde que les 9 derniers chiffres.
 * Approximatif mais suffisant pour rapprocher un expéditeur Twilio (E.164)
 * d'un numéro de contact saisi à la main dans Airtable.
 */
export function samePhoneNumber(a: string, b: string): boolean {
  const digitsOnly = (s: string) => s.replace(/\D/g, "").slice(-9);
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  return da.length > 0 && da === db;
}

export function writeAttachments(
  input: { url: string; filename?: string }[] | undefined
): { url: string; filename?: string }[] | undefined {
  if (!input) return undefined;
  return input.filter((a) => a.url?.trim()).map((a) => ({ url: a.url.trim(), filename: a.filename }));
}
