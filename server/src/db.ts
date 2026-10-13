import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import type { Admin, BoiteSecreteConfig, Profile, Project, Signup } from "./types.js";

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

function writeJsonAtomic(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpPath, filePath);
}

class AdminStore {
  private admins: Admin[];

  constructor(private readonly filePath: string) {
    this.admins = readJson<Admin[]>(filePath, []);
  }

  private persist(): void {
    writeJsonAtomic(this.filePath, this.admins);
  }

  list(): Admin[] {
    return [...this.admins];
  }

  findById(id: string): Admin | undefined {
    return this.admins.find((a) => a.id === id);
  }

  findByUsername(username: string): Admin | undefined {
    const needle = username.toLowerCase();
    return this.admins.find((a) => a.username.toLowerCase() === needle);
  }

  add(admin: Admin): void {
    this.admins.push(admin);
    this.persist();
  }

  update(id: string, patch: Partial<Admin>): Admin | undefined {
    const admin = this.findById(id);
    if (!admin) return undefined;
    Object.assign(admin, patch);
    this.persist();
    return admin;
  }
}

// Projets livrés par défaut, utilisés si aucun fichier n'existe encore à
// l'emplacement configuré (première exécution sur un nouvel emplacement de
// stockage, ex: disque persistant vierge). Modifiable ensuite via l'admin.
// Reprend les cartes "Mes créations" codées en dur dans public-site/index.html
// (sauf la carte "accès privé" / boîte secrète, personnelle et hors sujet pour
// un consommateur externe comme reine-cloud.fr) — source de données publique
// pour tout consommateur externe (ex: la page "agents sur mesure" de
// reine-cloud.fr, qui lit GET /api/projects). Si une carte est ajoutée ou
// modifiée dans public-site/index.html, reporter le même changement ici pour
// que l'API reste à jour (voir CLAUDE.md, section "API publique des projets").
const DEFAULT_PROJECTS: Project[] = [
  {
    id: "studio-cinema",
    title: "Medy fait du cinéma",
    description: "Je produis tes visuels vidéo ou images pour tout usage.",
    url: "https://emma-agt.onrender.com/agents/ecommerce",
    status: "live",
    badgeLabel: "Agent vidéo",
    image: "https://medy.site/studio-agent.jpg",
    badgeColor: "#dbeafe",
    badgeTextColor: "#1d4ed8",
    order: 1,
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
  },
  {
    id: "tierspayant-site",
    title: "Medy fait ton tiers payant",
    description:
      "SaaS d'automatisation pour opticiens : détection automatique des accords de prise en charge tiers payant reçus par mail, classement et notification.",
    url: "https://tierspayant.site",
    status: "live",
    badgeLabel: "Agent tiers payant",
    image: "https://medy.site/tierspayant-agent.jpg",
    badgeColor: "#dcfce7",
    badgeTextColor: "#15803d",
    order: 2,
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
  },
  {
    id: "audit-transcription",
    title: "Medy Audite",
    description: "Transcrivez vos réunions, vos audits, vos conversations en texte et analysez-les avec Medy.",
    url: "https://naiom-platform.onrender.com/agents/fireflies",
    status: "live",
    badgeLabel: "Agent transcription",
    image: "https://medy.site/audit-agent.jpg",
    badgeColor: "#ede9fe",
    badgeTextColor: "#6d28d9",
    order: 3,
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
  },
  {
    id: "propositions-commerciales",
    title: "Medy fait des propositions",
    description: "Je prépare des propositions commerciales claires et sur mesure pour tes projets.",
    url: "https://victor-agt-medy.onrender.com/",
    status: "live",
    badgeLabel: "Propositions commerciales",
    image: "https://medy.site/propositions-agent.jpg",
    badgeColor: "#fef3c7",
    badgeTextColor: "#92400e",
    order: 4,
    createdAt: "2026-09-21T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
  },
  {
    id: "facilog-opticien",
    title: "Medy facilite l'optique",
    description: "Logiciel complet pour opticiens et audioprothésistes, de la prescription à la facturation.",
    url: "https://www.facilog.site",
    status: "live",
    badgeLabel: "Agent opticien",
    image: "https://medy.site/opticien-agent.jpg",
    badgeColor: "#cffafe",
    badgeTextColor: "#0e7490",
    order: 5,
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "reine-cloud",
    title: "Medy règne sur le cloud",
    description: "Hébergement, cloud et intelligence artificielle, souverains et hébergés en France.",
    url: "https://www.reine-cloud.fr",
    status: "live",
    badgeLabel: "Hébergement souverain",
    image: "https://medy.site/reinecloud-agent.jpg",
    badgeColor: "#fdf6e3",
    badgeTextColor: "#8a6d1f",
    order: 6,
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "automedy",
    title: "Medy automatise tout",
    description: "Moteur d'automatisation auto-hébergé : déclencheurs, connecteurs et scénarios visuels, sans dépendre d'un tiers.",
    url: "https://automator-medy.osc-fr1.scalingo.io",
    status: "live",
    badgeLabel: "Agent automatisation",
    image: "https://medy.site/automedy-agent.jpg",
    badgeColor: "#ccfbf1",
    badgeTextColor: "#0f766e",
    order: 7,
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "club-culture-petanque",
    title: "Medy joue la pétanque",
    description: "Site du Club Culture Pétanque (Martinique) : événements, boutique, inscriptions et espace membres.",
    url: "https://club-cuture-petanque.reine-cloud.fr",
    status: "live",
    badgeLabel: "Site associatif",
    image: "https://medy.site/petanque-agent.jpg",
    badgeColor: "#dcfce7",
    badgeTextColor: "#166534",
    order: 8,
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "montagepourtous",
    title: "Medy fait le montage",
    description: "Outils gratuits de montage photos, vidéos et sons, avec effets cinéma, directement dans le navigateur.",
    url: "https://montagepourtous.reine-cloud.fr",
    status: "live",
    badgeLabel: "Montage gratuit",
    image: "https://medy.site/montage-agent.jpg",
    badgeColor: "#fee2e2",
    badgeTextColor: "#991b1b",
    order: 9,
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
  },
  {
    id: "whaoo",
    title: "Medy fait les courses",
    description: "Liste de courses à la voix, suivi du budget du mois et cagnotte d'épargne, dans une appli mobile.",
    url: "https://whaoo.site",
    status: "live",
    badgeLabel: "Courses & budget",
    image: "https://medy.site/whaoo-agent.jpg",
    badgeColor: "#dcefe4",
    badgeTextColor: "#264a41",
    order: 10,
    createdAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
  },
  {
    id: "coloriage-outre-mer",
    title: "Medy fait colorier les outre-mers",
    description: "Appli de coloriage installable et hors ligne, sur la faune, la flore et les paysages des outre-mers.",
    url: "https://whaoo.site/coloriage",
    status: "live",
    badgeLabel: "Coloriage numérique",
    image: "https://medy.site/coloriage-agent.jpg",
    badgeColor: "#fef3c7",
    badgeTextColor: "#92650a",
    order: 11,
    createdAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
  },
  {
    id: "scan-documents",
    title: "Medy scanne tes documents",
    description: "Scan de pièces d'identité (carte, passeport...) depuis un simple lien ouvert sur smartphone.",
    url: "https://scan.reine-cloud.fr",
    status: "live",
    badgeLabel: "Vérification d'identité",
    image: "https://medy.site/scan-agent.jpg",
    badgeColor: "#e0e7ff",
    badgeTextColor: "#4338ca",
    order: 12,
    createdAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
  },
];

class ProjectStore {
  private projects: Project[];

  constructor(private readonly filePath: string) {
    this.projects = readJson<Project[]>(filePath, DEFAULT_PROJECTS);
  }

  private persist(): void {
    writeJsonAtomic(this.filePath, this.projects);
  }

  /** Tous les projets (usage admin), triés par ordre d'affichage. */
  list(): Project[] {
    return [...this.projects].sort((a, b) => a.order - b.order);
  }

  /** Projets visibles publiquement (usage site medy.site), triés par ordre d'affichage. */
  listPublic(): Project[] {
    return this.list().filter((p) => p.status !== "draft");
  }

  findById(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  add(project: Project): void {
    this.projects.push(project);
    this.persist();
  }

  update(id: string, patch: Partial<Project>): Project | undefined {
    const project = this.findById(id);
    if (!project) return undefined;
    Object.assign(project, patch, { updatedAt: new Date().toISOString() });
    this.persist();
    return project;
  }

  remove(id: string): boolean {
    const before = this.projects.length;
    this.projects = this.projects.filter((p) => p.id !== id);
    if (this.projects.length === before) return false;
    this.persist();
    return true;
  }
}

// Valeurs par défaut si aucun fichier n'existe encore — reprend le profil
// codé en dur dans public-site/index.html avant que cette page ne lise ses
// données depuis /api/profile.
const DEFAULT_PROFILE: Profile = {
  firstName: "Medy Harry",
  lastName: "CAZAL",
  jobTitle: "Consultant Digital et IA",
  email: "cazal@medy.site",
  phone: "06 74 20 16 6 62",
  bio: "J'accompagne les marques et les projets créatifs avec une communication claire, humaine et engagée.",
  siteTitle: "Profil Connecté",
  photoUrl: "",
  updatedAt: "2026-09-15T00:00:00.000Z",
};

class ProfileStore {
  private profile: Profile;

  constructor(private readonly filePath: string) {
    this.profile = readJson<Profile>(filePath, DEFAULT_PROFILE);
  }

  private persist(): void {
    writeJsonAtomic(this.filePath, this.profile);
  }

  get(): Profile {
    return this.profile;
  }

  update(patch: Partial<Omit<Profile, "updatedAt">>): Profile {
    this.profile = { ...this.profile, ...patch, updatedAt: new Date().toISOString() };
    this.persist();
    return this.profile;
  }
}

// Valeur par défaut = hash du code déjà en dur dans public-site/boite-secrete.html
// avant que cette page ne le lise depuis /api/boite-secrete (code d'origine : MEDYOUTILS26).
const DEFAULT_BOITE_SECRETE: BoiteSecreteConfig = {
  codeHash: "e91792f460242030884a64e627c4c93c93b40edcabd36178c1e58a26b6d887e6",
  updatedAt: "2026-09-21T00:00:00.000Z",
};

class BoiteSecreteStore {
  private config: BoiteSecreteConfig;

  constructor(private readonly filePath: string) {
    this.config = readJson<BoiteSecreteConfig>(filePath, DEFAULT_BOITE_SECRETE);
  }

  private persist(): void {
    writeJsonAtomic(this.filePath, this.config);
  }

  get(): BoiteSecreteConfig {
    return this.config;
  }

  update(codeHash: string): BoiteSecreteConfig {
    this.config = { codeHash, updatedAt: new Date().toISOString() };
    this.persist();
    return this.config;
  }
}

class SignupStore {
  private signups: Signup[];

  constructor(private readonly filePath: string) {
    this.signups = readJson<Signup[]>(filePath, []);
  }

  private persist(): void {
    writeJsonAtomic(this.filePath, this.signups);
  }

  list(): Signup[] {
    return [...this.signups].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  findByEmail(email: string): Signup | undefined {
    const needle = email.toLowerCase();
    return this.signups.find((s) => s.email.toLowerCase() === needle);
  }

  add(signup: Signup): void {
    this.signups.push(signup);
    this.persist();
  }

  remove(id: string): boolean {
    const before = this.signups.length;
    this.signups = this.signups.filter((s) => s.id !== id);
    if (this.signups.length === before) return false;
    this.persist();
    return true;
  }
}

export const adminStore = new AdminStore(config.adminsPath);
export const projectStore = new ProjectStore(config.projectsPath);
export const signupStore = new SignupStore(config.signupsPath);
export const profileStore = new ProfileStore(config.profilePath);
export const boiteSecreteStore = new BoiteSecreteStore(config.boiteSecretePath);
