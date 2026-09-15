import type { Admin, Branding, Project, Signup } from "./types";

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (res.status === 401) {
    onUnauthorized?.();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getConfig: () => request<{ branding: Branding }>("/config"),

  login: (username: string, password: string) =>
    request<{ ok: true; admin: Admin }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),

  me: () => request<{ admin: Admin }>("/auth/me"),

  updateProfile: (payload: { currentPassword: string; newUsername?: string; newPassword?: string }) =>
    request<{ admin: Admin }>("/auth/profile", { method: "PATCH", body: JSON.stringify(payload) }),

  listProjects: () => request<{ projects: Project[] }>("/projects/all"),

  createProject: (payload: Partial<Project>) =>
    request<{ project: Project }>("/projects", { method: "POST", body: JSON.stringify(payload) }),

  updateProject: (id: string, payload: Partial<Project>) =>
    request<{ project: Project }>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  deleteProject: (id: string) => request<undefined>(`/projects/${id}`, { method: "DELETE" }),

  listSignups: () => request<{ signups: Signup[] }>("/signups"),

  deleteSignup: (id: string) => request<undefined>(`/signups/${id}`, { method: "DELETE" }),
};

// --- CRM (Airtable) : générique, les 9 ressources ont la même forme REST ---

export const crmApi = {
  list: (resourcePath: string) => request<Record<string, unknown[]>>(`/crm/${resourcePath}`),

  create: (resourcePath: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/crm/${resourcePath}`, { method: "POST", body: JSON.stringify(data) }),

  update: (resourcePath: string, id: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/crm/${resourcePath}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  remove: (resourcePath: string, id: string) =>
    request<undefined>(`/crm/${resourcePath}/${id}`, { method: "DELETE" }),
};

// --- Messagerie/téléphonie (Twilio) ---

export const twilioApi = {
  sendMessage: (payload: {
    channel: "sms" | "whatsapp";
    to: string;
    body: string;
    contactId?: string;
    projectId?: string;
  }) => request<{ message: Record<string, unknown> }>("/twilio/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

  call: (payload: { to: string; contactId?: string; projectId?: string }) =>
    request<{ callSid: string; status: string }>("/twilio/call", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
