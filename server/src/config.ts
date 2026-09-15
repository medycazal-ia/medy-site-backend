import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..");

const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(serverRoot, "data"));

export const config = {
  port: Number(process.env.PORT ?? 4200),

  branding: {
    name: process.env.BRAND_NAME ?? "medy.site",
  },

  dataDir,
  adminsPath: path.resolve(process.env.ADMINS_PATH ?? path.join(dataDir, "admins.json")),
  projectsPath: path.resolve(process.env.PROJECTS_PATH ?? path.join(dataDir, "projects.json")),
  signupsPath: path.resolve(process.env.SIGNUPS_PATH ?? path.join(dataDir, "signups.json")),

  auth: {
    username: process.env.ADMIN_USERNAME ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "",
    sessionSecret: process.env.SESSION_SECRET ?? "",
    sessionTtlMs: 12 * 60 * 60 * 1000, // 12h
  },
};
