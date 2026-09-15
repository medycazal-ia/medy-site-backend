export interface Admin {
  id: string;
  username: string;
  createdAt: string;
}

export interface Branding {
  name: string;
}

export type ProjectStatus = "live" | "soon" | "draft";

export interface Project {
  id: string;
  title: string;
  description: string;
  url: string;
  status: ProjectStatus;
  badgeLabel: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Signup {
  id: string;
  email: string;
  source: string;
  createdAt: string;
}
