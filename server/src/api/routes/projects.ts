import crypto from "node:crypto";
import { Router } from "express";
import { projectStore } from "../../db.js";
import { requireAuth } from "../../services/authService.js";
import type { Project, ProjectStatus } from "../../types.js";

export const projectsRouter = Router();

const VALID_STATUSES: ProjectStatus[] = ["live", "soon", "draft"];

// Public : liste des projets à afficher dans "Mes créations" sur medy.site.
projectsRouter.get("/", (_req, res) => {
  res.json({ projects: projectStore.listPublic() });
});

// Admin : tous les projets, y compris les brouillons, pour la gestion.
projectsRouter.get("/all", requireAuth, (_req, res) => {
  res.json({ projects: projectStore.list() });
});

projectsRouter.post("/", requireAuth, (req, res) => {
  const body = req.body as Partial<Project>;
  if (!body.title?.trim()) {
    return res.status(400).json({ error: "Le titre est requis" });
  }
  if (!body.url?.trim()) {
    return res.status(400).json({ error: "L'URL est requise" });
  }
  const status = body.status && VALID_STATUSES.includes(body.status) ? body.status : "draft";

  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    title: body.title.trim(),
    description: body.description?.trim() ?? "",
    url: body.url.trim(),
    status,
    badgeLabel: body.badgeLabel?.trim() ?? "",
    order: Number.isFinite(body.order) ? Number(body.order) : projectStore.list().length + 1,
    createdAt: now,
    updatedAt: now,
  };
  projectStore.add(project);
  res.status(201).json({ project });
});

projectsRouter.patch("/:id", requireAuth, (req, res) => {
  const patch = req.body as Partial<Project>;
  delete (patch as Record<string, unknown>).id;
  delete (patch as Record<string, unknown>).createdAt;
  if (patch.status && !VALID_STATUSES.includes(patch.status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }

  const project = projectStore.update(req.params.id, patch);
  if (!project) return res.status(404).json({ error: "Projet introuvable" });
  res.json({ project });
});

projectsRouter.delete("/:id", requireAuth, (req, res) => {
  const removed = projectStore.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: "Projet introuvable" });
  res.status(204).end();
});
