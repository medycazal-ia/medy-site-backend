import { useEffect, useState } from "react";
import { api } from "../api";
import type { Project, ProjectStatus } from "../types";

const EMPTY_FORM = {
  title: "",
  description: "",
  url: "",
  status: "draft" as ProjectStatus,
  badgeLabel: "",
  order: 1,
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  live: "En ligne",
  soon: "Bientôt",
  draft: "Brouillon (masqué)",
};

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const { projects } = await api.listProjects();
      setProjects(projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(project: Project) {
    setEditingId(project.id);
    setForm({
      title: project.title,
      description: project.description,
      url: project.url,
      status: project.status,
      badgeLabel: project.badgeLabel,
      order: project.order,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await api.updateProject(editingId, form);
      } else {
        await api.createProject(form);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce projet ?")) return;
    await api.deleteProject(id);
    if (editingId === id) resetForm();
    load();
  }

  return (
    <>
      <div className="glass-card">
        <div className="section-title">{editingId ? "Modifier le projet" : "Ajouter un projet"}</div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="title">Titre</label>
            <input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ex: tierspayant.site"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="url">URL (ouverte dans un nouvel onglet)</label>
            <input
              id="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
              required
            />
          </div>
          <div className="field">
            <label htmlFor="badgeLabel">Badge (optionnel, ex: "Démo en ligne")</label>
            <input
              id="badgeLabel"
              value={form.badgeLabel}
              onChange={(e) => setForm({ ...form, badgeLabel: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="status">Statut</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
            >
              <option value="live">En ligne</option>
              <option value="soon">Bientôt</option>
              <option value="draft">Brouillon (masqué du site public)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="order">Ordre d'affichage</label>
            <input
              id="order"
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </div>
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
        <div className="section-title">Projets ({projects.length})</div>
        {projects.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Aucun projet pour l'instant.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Statut</th>
                <th>Ordre</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{p.title}</div>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                      {p.url}
                    </a>
                  </td>
                  <td>
                    <span className={`pill pill-${p.status}`}>{STATUS_LABEL[p.status]}</span>
                  </td>
                  <td>{p.order}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost" onClick={() => startEdit(p)}>
                        Modifier
                      </button>
                      <button className="btn btn-ghost" onClick={() => handleDelete(p.id)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
