import { useEffect, useState } from "react";
import { api } from "../api";
import type { Signup } from "../types";

export function Signups() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette inscription ?")) return;
    await api.deleteSignup(id);
    load();
  }

  return (
    <div className="glass-card">
      <div className="section-title">Inscriptions ({signups.length})</div>
      {error && <div className="error-banner">{error}</div>}
      {signups.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Aucune inscription pour l'instant.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Source</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {signups.map((s) => (
              <tr key={s.id}>
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
  );
}
