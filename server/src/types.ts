export interface Admin {
  id: string;
  username: string;
  /** Format "sel:empreinte" (scrypt), jamais le mot de passe en clair. */
  passwordHash: string;
  createdAt: string;
}

export type PublicAdmin = Omit<Admin, "passwordHash">;

export type ProjectStatus = "live" | "soon" | "draft";

export interface Project {
  id: string;
  title: string;
  description: string;
  /** URL externe ouverte dans un nouvel onglet depuis la vignette du portfolio. */
  url: string;
  status: ProjectStatus;
  /** Ex: "Démo en ligne" — affiché en badge sur la vignette quand status = "live". */
  badgeLabel: string;
  /** Ordre d'affichage dans la grille "Mes créations" (croissant). */
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  bio: string;
  /** Titre affiché dans l'onglet du navigateur et dans l'en-tête du site public. */
  siteTitle: string;
  /** URL http(s) optionnelle ; vide = garde la photo par défaut (public-site/avatar.jpg). */
  photoUrl: string;
  updatedAt: string;
}

export interface BoiteSecreteConfig {
  /** SHA-256 hex du code d'accès — jamais le code en clair. */
  codeHash: string;
  updatedAt: string;
}

export interface Signup {
  id: string;
  /** Optionnel : une inscription publique via le formulaire du site ne demande que l'email. */
  name: string;
  email: string;
  /** D'où vient l'inscription, ex: "header" — libre, pour distinguer plusieurs points d'entrée futurs. */
  source: string;
  createdAt: string;
}
