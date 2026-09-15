import { Router } from "express";
import { HttpError } from "../httpError.js";

export interface CrudRepo<T, TInput> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(id: string, patch: Partial<TInput>): Promise<T>;
  remove(id: string): Promise<void>;
}

/** Monte les 5 routes REST standard (list/get/create/update/delete) pour un repo CRM. */
export function createCrudRouter<T, TInput>(
  repo: CrudRepo<T, TInput>,
  singular: string,
  plural: string
) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      res.json({ [plural]: await repo.list() });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const item = await repo.get(req.params.id);
      if (!item) return res.status(404).json({ error: `${singular} introuvable` });
      res.json({ [singular]: item });
    } catch (err) {
      next(err);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const item = await repo.create(req.body);
      res.status(201).json({ [singular]: item });
    } catch (err) {
      next(err);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const item = await repo.update(req.params.id, req.body);
      res.json({ [singular]: item });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      await repo.remove(req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export { HttpError };
