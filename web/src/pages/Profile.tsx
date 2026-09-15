import { useEffect, useState } from "react";
import { api } from "../api";
import type { Profile as ProfileData } from "../types";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  email: "",
  phone: "",
  bio: "",
  siteTitle: "",
  photoUrl: "",
};

export function Profile() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { profile } = await api.getPublicProfile();
      setForm(toForm(profile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toForm(profile: ProfileData) {
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      jobTitle: profile.jobTitle,
      email: profile.email,
      phone: profile.phone,
      bio: profile.bio,
      siteTitle: profile.siteTitle,
      photoUrl: profile.photoUrl,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const { profile } = await api.updatePublicProfile(form);
      setForm(toForm(profile));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement");
    }
  }

  if (loading) return null;

  return (
    <div className="glass-card">
      <div className="section-title">Mon profil public</div>
      <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginTop: -8, marginBottom: 16 }}>
        Ces informations sont affichées en direct sur medy.site (nom, fonction, présentation, coordonnées).
      </p>
      {error && <div className="error-banner">{error}</div>}
      {saved && !error && <div className="success-banner">Profil enregistré et visible sur le site public.</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="firstName">Prénom</label>
          <input
            id="firstName"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="lastName">Nom</label>
          <input
            id="lastName"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="jobTitle">Fonction</label>
          <input
            id="jobTitle"
            value={form.jobTitle}
            onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
            placeholder="ex: Consultant RH et Digital"
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Téléphone</label>
          <input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="bio">Présentation</label>
          <textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="siteTitle">Titre du site (onglet du navigateur)</label>
          <input
            id="siteTitle"
            value={form.siteTitle}
            onChange={(e) => setForm({ ...form, siteTitle: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="photoUrl">Photo de profil (URL, optionnel)</label>
          <input
            id="photoUrl"
            type="url"
            value={form.photoUrl}
            onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
            placeholder="https://... (vide = garde la photo actuelle du site)"
          />
        </div>
        <div className="row-actions">
          <button className="btn btn-primary" type="submit">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
