import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import type { Admin, Project, Signup } from "./types.js";

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
const DEFAULT_PROJECTS: Project[] = [
  {
    id: "tierspayant-site",
    title: "tierspayant.site",
    description:
      "SaaS d'automatisation pour opticiens : détection automatique des accords de prise en charge tiers payant reçus par mail, classement et notification.",
    url: "https://tierspayant.site",
    status: "live",
    badgeLabel: "Démo en ligne",
    order: 1,
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
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
