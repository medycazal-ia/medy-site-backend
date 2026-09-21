import { useEffect, useState } from "react";
import { api } from "../api";

export function BoiteSecrete() {
  const [code, setCode] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { updatedAt } = await api.getBoiteSecreteStatus();
      setUpdatedAt(updatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const { updatedAt } = await api.updateBoiteSecreteCode(code);
      setUpdatedAt(updatedAt);
      setCode("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement");
    }
  }

  if (loading) return null;

  return (
    <div className="glass-card">
      <div className="section-title">Boîte secrète — code d'accès</div>
      <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: -8, marginBottom: 16 }}>
        Le code demandé sur la page "Ma boîte secrète" (medy.site/boite-secrete.html). Si tu l'as
        oublié, il n'y a aucun moyen de le retrouver — seulement de le réinitialiser ci-dessous.
        Le nouveau code s'applique immédiatement pour tes visiteurs.
      </p>
      {error && <div className="error-banner">{error}</div>}
      {saved && !error && <div className="success-banner">Code mis à jour.</div>}
      {updatedAt && (
        <p style={{ color: "var(--text-muted)", fontSize: 12.5, marginBottom: 12 }}>
          Dernière modification : {new Date(updatedAt).toLocaleString("fr-FR")}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="boite-secrete-code">Nouveau code d'accès</label>
          <input
            id="boite-secrete-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Au moins 4 caractères"
            minLength={4}
            required
          />
        </div>
        <div className="row-actions">
          <button className="btn btn-primary" type="submit">
            Réinitialiser le code
          </button>
        </div>
      </form>
    </div>
  );
}
