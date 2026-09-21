import { useEffect, useState } from "react";
import { api, setUnauthorizedHandler } from "./api";
import { CrmResourcePage } from "./crm/CrmResourcePage";
import { MessageComposer } from "./crm/MessageComposer";
import { RESOURCE_ORDER, RESOURCES, type ResourceKey } from "./crm/schema";
import { BoiteSecrete } from "./pages/BoiteSecrete";
import { Login } from "./pages/Login";
import { Profile } from "./pages/Profile";
import { Projects } from "./pages/Projects";
import { Signups } from "./pages/Signups";
import type { Admin } from "./types";

type Section = "portfolio" | "crm";
type PortfolioTab = "profile" | "projects" | "signups" | "boiteSecrete";

export function App() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState<Section>("portfolio");
  const [portfolioTab, setPortfolioTab] = useState<PortfolioTab>("profile");
  const [crmTab, setCrmTab] = useState<ResourceKey>("companies");
  const [messagesRefresh, setMessagesRefresh] = useState(0);

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
        <button className={`tab-button ${section === "portfolio" ? "active" : ""}`} onClick={() => setSection("portfolio")}>
          Portfolio du site
        </button>
        <button className={`tab-button ${section === "crm" ? "active" : ""}`} onClick={() => setSection("crm")}>
          Clients
        </button>
      </div>

      {section === "portfolio" && (
        <>
          <div className="tabs subtabs">
            <button
              className={`tab-button ${portfolioTab === "profile" ? "active" : ""}`}
              onClick={() => setPortfolioTab("profile")}
            >
              Mon profil
            </button>
            <button
              className={`tab-button ${portfolioTab === "projects" ? "active" : ""}`}
              onClick={() => setPortfolioTab("projects")}
            >
              Mes créations
            </button>
            <button
              className={`tab-button ${portfolioTab === "signups" ? "active" : ""}`}
              onClick={() => setPortfolioTab("signups")}
            >
              Inscriptions
            </button>
            <button
              className={`tab-button ${portfolioTab === "boiteSecrete" ? "active" : ""}`}
              onClick={() => setPortfolioTab("boiteSecrete")}
            >
              Boîte secrète
            </button>
          </div>
          {portfolioTab === "profile" && <Profile />}
          {portfolioTab === "projects" && <Projects />}
          {portfolioTab === "signups" && <Signups />}
          {portfolioTab === "boiteSecrete" && <BoiteSecrete />}
        </>
      )}

      {section === "crm" && (
        <>
          <div className="tabs subtabs">
            {RESOURCE_ORDER.map((key) => (
              <button key={key} className={`tab-button ${crmTab === key ? "active" : ""}`} onClick={() => setCrmTab(key)}>
                {RESOURCES[key].label}
              </button>
            ))}
          </div>
          {crmTab === "messages" && (
            <MessageComposer onSent={() => setMessagesRefresh((n) => n + 1)} />
          )}
          <CrmResourcePage resourceKey={crmTab} key={crmTab === "messages" ? `messages-${messagesRefresh}` : crmTab} />
        </>
      )}
    </div>
  );
}
