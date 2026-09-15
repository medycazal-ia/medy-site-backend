import { useState } from "react";
import { api } from "../api";
import type { Admin } from "../types";

export function Login({ onLoggedIn }: { onLoggedIn: (admin: Admin) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { admin } = await api.login(username, password);
      onLoggedIn(admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="glass-card login-card" onSubmit={handleSubmit}>
        <div className="login-title">medy.site</div>
        <div className="login-subtitle">Administration</div>
        {error && <div className="error-banner">{error}</div>}
        <div className="field">
          <label htmlFor="username">Identifiant</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
