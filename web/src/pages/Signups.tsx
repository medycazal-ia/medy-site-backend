import { useEffect, useState } from "react";
import { api } from "../api";
import type { Signup } from "../types";

export function Signups() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    try {
      const { signups } = await api.listSignups();
      setSignups(signups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    try {
      const { alreadyRegistered } = await api.createSignup({ name: name.trim() || undefined, email: email.trim() });
      setStatus(alreadyRegistered ? "Cette adresse était déjà inscrite." : "Inscription ajoutée.");
      setName("");
      setEmail("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette inscription ?")) return;
    await api.deleteSignup(id);
    load();
  }

  return (
    <>
      <div className="glass-card">
        <div className="section-title">Ajouter une inscription</div>
        {error && <div className="error-banner">{error}</div>}
        {status && <div className="status-banner">{status}</div>}
        <form onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="signup-name">Nom (optionnel)</label>
            <input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Jeanne Dupont" />
          </div>
          <div className="field">
            <label htmlFor="signup-email-admin">Email</label>
            <input
              id="signup-email-admin"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: jeanne@example.com"
              required
            />
          </div>
          <div className="row-actions">
            <button className="btn btn-primary" type="submit">
              Ajouter
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card">
        <div className="section-title">Inscriptions ({signups.length})</div>
        {signups.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Aucune inscription pour l'instant.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Source</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                <tr key={s.id}>
                  <td>{s.name || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td>{s.email}</td>
                  <td>{s.source}</td>
                  <td>{new Date(s.createdAt).toLocaleString("fr-FR")}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => handleDelete(s.id)}>
                      Supprimer
                    </button>
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
