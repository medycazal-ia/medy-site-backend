import { useEffect, useMemo, useState } from "react";
import { crmApi } from "../api";
import { RESOURCES, type Field, type ResourceKey, type ResourceSchema } from "./schema";

type Row = Record<string, unknown>;

function emptyForm(schema: ResourceSchema): Row {
  const form: Row = {};
  for (const field of schema.fields) {
    if (field.type === "link") form[field.key] = [];
    else if (field.type === "attachments") form[field.key] = [];
    else if (field.type === "number") form[field.key] = "";
    else form[field.key] = "";
  }
  return form;
}

function formToPayload(schema: ResourceSchema, form: Row): Row {
  const payload: Row = {};
  for (const field of schema.fields) {
    const value = form[field.key];
    if (field.type === "number") {
      payload[field.key] = value === "" || value === undefined ? undefined : Number(value);
    } else if (field.type === "attachments") {
      payload[field.key] = value;
    } else {
      payload[field.key] = value;
    }
  }
  return payload;
}

function rowToForm(schema: ResourceSchema, row: Row): Row {
  const form: Row = {};
  for (const field of schema.fields) {
    const value = row[field.key];
    if (field.type === "link") form[field.key] = Array.isArray(value) ? value : [];
    else if (field.type === "attachments") form[field.key] = Array.isArray(value) ? value : [];
    else form[field.key] = value ?? "";
  }
  return form;
}

/** Une seule page générique pour les 9 ressources CRM : même forme REST côté serveur. */
export function CrmResourcePage({ resourceKey }: { resourceKey: ResourceKey }) {
  const schema = RESOURCES[resourceKey];
  const linkedKeys = useMemo(
    () => Array.from(new Set(schema.fields.filter((f) => f.type === "link").map((f) => f.linkTo!))),
    [schema]
  );

  const [rows, setRows] = useState<Row[]>([]);
  const [linkedRows, setLinkedRows] = useState<Partial<Record<ResourceKey, Row[]>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Row>(() => emptyForm(schema));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setError(null);
    try {
      const [own, ...linked] = await Promise.all([
        crmApi.list(schema.key),
        ...linkedKeys.map((k) => crmApi.list(k)),
      ]);
      setRows((own[schema.listKey] as Row[]) ?? []);
      const nextLinked: Partial<Record<ResourceKey, Row[]>> = {};
      linkedKeys.forEach((k, i) => {
        nextLinked[k] = (linked[i][RESOURCES[k].listKey] as Row[]) ?? [];
      });
      setLinkedRows(nextLinked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setEditingId(null);
    setForm(emptyForm(schema));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey]);

  function labelFor(linkTo: ResourceKey, id: string): string {
    const target = linkedRows[linkTo]?.find((r) => r.id === id);
    if (!target) return id;
    return String(target[RESOURCES[linkTo].titleField] ?? id);
  }

  function startEdit(row: Row) {
    setEditingId(row.id as string);
    setForm(rowToForm(schema, row));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(schema));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = formToPayload(schema, form);
      if (editingId) {
        await crmApi.update(schema.key, editingId, payload);
      } else {
        await crmApi.create(schema.key, payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet élément ?")) return;
    await crmApi.remove(schema.key, id);
    if (editingId === id) resetForm();
    load();
  }

  function updateField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleLink(field: Field, id: string) {
    const current = (form[field.key] as string[]) ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updateField(field.key, next);
  }

  function renderFieldInput(field: Field) {
    const value = form[field.key];

    if (field.type === "textarea") {
      return (
        <textarea
          id={field.key}
          value={(value as string) ?? ""}
          onChange={(e) => updateField(field.key, e.target.value)}
        />
      );
    }

    if (field.type === "select") {
      return (
        <select id={field.key} value={(value as string) ?? ""} onChange={(e) => updateField(field.key, e.target.value)}>
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "link") {
      const options = linkedRows[field.linkTo!] ?? [];
      const selected = (value as string[]) ?? [];
      return (
        <div className="chip-picker">
          {options.length === 0 && (
            <span className="chip-empty">{RESOURCES[field.linkTo!].label} : rien pour l'instant</span>
          )}
          {options.map((o) => {
            const id = o.id as string;
            const active = selected.includes(id);
            return (
              <button
                type="button"
                key={id}
                className={`chip ${active ? "chip-active" : ""}`}
                onClick={() => toggleLink(field, id)}
              >
                {String(o[RESOURCES[field.linkTo!].titleField] ?? id)}
              </button>
            );
          })}
        </div>
      );
    }

    if (field.type === "attachments") {
      const items = (value as { url: string; filename?: string }[]) ?? [];
      return (
        <div>
          {items.map((a, i) => (
            <div key={i} className="attachment-row">
              <a href={a.url} target="_blank" rel="noopener noreferrer">
                {a.filename || a.url}
              </a>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => updateField(field.key, items.filter((_, j) => j !== i))}
              >
                Retirer
              </button>
            </div>
          ))}
          <AddAttachment onAdd={(a) => updateField(field.key, [...items, a])} />
        </div>
      );
    }

    return (
      <input
        id={field.key}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : "text"}
        value={(value as string) ?? ""}
        onChange={(e) => updateField(field.key, e.target.value)}
        required={field.required}
      />
    );
  }

  function renderCellValue(field: Field, row: Row) {
    const value = row[field.key];
    if (field.type === "link") {
      const ids = (value as string[]) ?? [];
      if (ids.length === 0) return <span className="cell-muted">—</span>;
      return ids.map((id) => labelFor(field.linkTo!, id)).join(", ");
    }
    if (field.type === "attachments") {
      const items = (value as { url: string }[]) ?? [];
      return items.length === 0 ? <span className="cell-muted">—</span> : `${items.length} fichier(s)`;
    }
    if (field.type === "textarea") {
      const text = String(value ?? "");
      return text.length > 80 ? `${text.slice(0, 80)}…` : text || <span className="cell-muted">—</span>;
    }
    if (!value) return <span className="cell-muted">—</span>;
    return String(value);
  }

  if (loading) return null;

  return (
    <>
      <div className="glass-card">
        <div className="section-title">{editingId ? `Modifier — ${schema.label}` : `Ajouter — ${schema.label}`}</div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          {schema.fields.map((field) => (
            <div className="field" key={field.key}>
              <label htmlFor={field.key}>{field.label}</label>
              {renderFieldInput(field)}
            </div>
          ))}
          <div className="row-actions">
            <button className="btn btn-primary" type="submit">
              {editingId ? "Enregistrer" : "Ajouter"}
            </button>
            {editingId && (
              <button className="btn btn-ghost" type="button" onClick={resetForm}>
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="glass-card">
        <div className="section-title">
          {schema.label} ({rows.length})
        </div>
        {rows.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Rien pour l'instant.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {schema.fields
                    .filter((f) => f.type !== "textarea")
                    .map((f) => (
                      <th key={f.key}>{f.label}</th>
                    ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id as string}>
                    {schema.fields
                      .filter((f) => f.type !== "textarea")
                      .map((f) => (
                        <td key={f.key}>{renderCellValue(f, row)}</td>
                      ))}
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost" onClick={() => startEdit(row)}>
                          Modifier
                        </button>
                        <button className="btn btn-ghost" onClick={() => handleDelete(row.id as string)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function AddAttachment({ onAdd }: { onAdd: (a: { url: string; filename?: string }) => void }) {
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  return (
    <div className="attachment-add">
      <input placeholder="URL du fichier (déjà hébergé)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <input placeholder="Nom (optionnel)" value={filename} onChange={(e) => setFilename(e.target.value)} />
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          if (!url.trim()) return;
          onAdd({ url: url.trim(), filename: filename.trim() || undefined });
          setUrl("");
          setFilename("");
        }}
      >
        Ajouter le lien
      </button>
    </div>
  );
}
