import { useEffect, useState } from "react";
import { api, setUnauthorizedHandler } from "./api";
import { Login } from "./pages/Login";
import { Projects } from "./pages/Projects";
import { Signups } from "./pages/Signups";
import type { Admin } from "./types";

type Tab = "projects" | "signups";

export function App() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("projects");

  useEffect(() => {
    setUnauthorizedHandler(() => setAdmin(null));
    api
      .me()
      .then(({ admin }) => setAdmin(admin))
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  async function handleLogout() {
    await api.logout();
    setAdmin(null);
  }

  if (checking) return null;

  if (!admin) {
    return <Login onLoggedIn={setAdmin} />;
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="app-title">medy.site — Administration</div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${tab === "projects" ? "active" : ""}`}
          onClick={() => setTab("projects")}
        >
          Mes créations
        </button>
        <button
          className={`tab-button ${tab === "signups" ? "active" : ""}`}
          onClick={() => setTab("signups")}
        >
          Inscriptions
        </button>
      </div>

      {tab === "projects" ? <Projects /> : <Signups />}
    </div>
  );
}
