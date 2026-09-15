export type FieldType = "text" | "textarea" | "number" | "date" | "datetime" | "select" | "link" | "attachments";

export type ResourceKey =
  | "companies"
  | "contacts"
  | "projects"
  | "meetings"
  | "audits"
  | "proposals"
  | "payments"
  | "roadmap"
  | "messages";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  /** Pour type "link" : quelle ressource propose les choix. */
  linkTo?: ResourceKey;
}

export interface ResourceSchema {
  key: ResourceKey;
  label: string;
  /** Clé du tableau dans la réponse JSON (ex: "companies", "steps"). */
  listKey: string;
  /** Clé de l'objet dans la réponse JSON d'un seul élément. */
  itemKey: string;
  /** Champ utilisé comme titre de ligne et comme libellé dans les sélecteurs liés. */
  titleField: string;
  fields: Field[];
}

export const RESOURCES: Record<ResourceKey, ResourceSchema> = {
  companies: {
    key: "companies",
    label: "Entreprises",
    listKey: "companies",
    itemKey: "company",
    titleField: "name",
    fields: [
      { key: "name", label: "Nom de l'entreprise", type: "text", required: true },
      { key: "sector", label: "Secteur d'activité", type: "text" },
      { key: "siret", label: "SIRET", type: "text" },
      { key: "website", label: "Site web", type: "text" },
      { key: "address", label: "Adresse", type: "text" },
      { key: "city", label: "Ville", type: "text" },
      { key: "postalCode", label: "Code postal", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  contacts: {
    key: "contacts",
    label: "Contacts",
    listKey: "contacts",
    itemKey: "contact",
    titleField: "fullName",
    fields: [
      { key: "fullName", label: "Nom complet", type: "text", required: true },
      { key: "role", label: "Poste", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Téléphone", type: "text" },
      { key: "companyIds", label: "Entreprise", type: "link", linkTo: "companies" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  projects: {
    key: "projects",
    label: "Projets",
    listKey: "projects",
    itemKey: "project",
    titleField: "name",
    fields: [
      { key: "name", label: "Nom du projet", type: "text", required: true },
      { key: "companyIds", label: "Entreprise", type: "link", linkTo: "companies" },
      { key: "contactIds", label: "Contact principal", type: "link", linkTo: "contacts" },
      {
        key: "status",
        label: "Statut",
        type: "select",
        options: ["Prospect", "Audit en cours", "Proposition envoyée", "Signé", "En cours", "Terminé", "Perdu"],
      },
      { key: "budget", label: "Budget (€)", type: "number" },
      { key: "startDate", label: "Date de début", type: "date" },
      { key: "targetLaunchDate", label: "Date de lancement cible", type: "date" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "images", label: "Images", type: "attachments" },
      { key: "videos", label: "Vidéos", type: "attachments" },
    ],
  },
  meetings: {
    key: "meetings",
    label: "Rendez-vous",
    listKey: "meetings",
    itemKey: "meeting",
    titleField: "title",
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "projectIds", label: "Projet", type: "link", linkTo: "projects" },
      { key: "contactIds", label: "Contact", type: "link", linkTo: "contacts" },
      { key: "type", label: "Type", type: "select", options: ["Audio", "Visio", "Téléphone", "Présentiel"] },
      { key: "date", label: "Date", type: "datetime" },
      { key: "status", label: "Statut", type: "select", options: ["Planifié", "Réalisé", "Annulé"] },
      { key: "recording", label: "Enregistrement", type: "attachments" },
      { key: "transcription", label: "Transcription", type: "textarea" },
      { key: "summary", label: "Compte-rendu", type: "textarea" },
    ],
  },
  audits: {
    key: "audits",
    label: "Audits",
    listKey: "audits",
    itemKey: "audit",
    titleField: "title",
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "projectIds", label: "Projet", type: "link", linkTo: "projects" },
      { key: "date", label: "Date", type: "date" },
      { key: "findings", label: "Constats", type: "textarea" },
      { key: "recommendations", label: "Recommandations", type: "textarea" },
      { key: "documents", label: "Documents", type: "attachments" },
    ],
  },
  proposals: {
    key: "proposals",
    label: "Propositions",
    listKey: "proposals",
    itemKey: "proposal",
    titleField: "title",
    fields: [
      { key: "title", label: "Titre", type: "text", required: true },
      { key: "projectIds", label: "Projet", type: "link", linkTo: "projects" },
      { key: "amount", label: "Montant (€)", type: "number" },
      { key: "status", label: "Statut", type: "select", options: ["Brouillon", "Envoyée", "Acceptée", "Refusée"] },
      { key: "sentDate", label: "Date d'envoi", type: "date" },
      { key: "validUntil", label: "Valable jusqu'au", type: "date" },
      { key: "document", label: "Document", type: "attachments" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  payments: {
    key: "payments",
    label: "Paiements",
    listKey: "payments",
    itemKey: "payment",
    titleField: "label",
    fields: [
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "projectIds", label: "Projet", type: "link", linkTo: "projects" },
      { key: "amount", label: "Montant (€)", type: "number" },
      { key: "dueDate", label: "Date d'échéance", type: "date" },
      { key: "status", label: "Statut", type: "select", options: ["À venir", "Payé", "En retard"] },
      { key: "paidDate", label: "Date de paiement", type: "date" },
      { key: "method", label: "Méthode", type: "select", options: ["Virement", "Carte", "Chèque", "Autre"] },
    ],
  },
  roadmap: {
    key: "roadmap",
    label: "Feuille de route",
    listKey: "steps",
    itemKey: "step",
    titleField: "step",
    fields: [
      { key: "step", label: "Étape", type: "text", required: true },
      { key: "projectIds", label: "Projet", type: "link", linkTo: "projects" },
      { key: "status", label: "Statut", type: "select", options: ["À faire", "En cours", "Fait", "Bloqué"] },
      { key: "dueDate", label: "Échéance", type: "date" },
      { key: "order", label: "Ordre", type: "number" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  messages: {
    key: "messages",
    label: "Messages",
    listKey: "messages",
    itemKey: "message",
    titleField: "subject",
    fields: [
      { key: "subject", label: "Sujet / Aperçu", type: "text", required: true },
      { key: "contactIds", label: "Contact", type: "link", linkTo: "contacts" },
      { key: "projectIds", label: "Projet", type: "link", linkTo: "projects" },
      {
        key: "channel",
        label: "Canal",
        type: "select",
        options: ["WhatsApp", "SMS", "Email", "Téléphone", "Site (formulaire)"],
      },
      { key: "direction", label: "Sens", type: "select", options: ["Entrant", "Sortant"] },
      { key: "date", label: "Date", type: "datetime" },
      { key: "content", label: "Contenu", type: "textarea" },
    ],
  },
};

export const RESOURCE_ORDER: ResourceKey[] = [
  "companies",
  "contacts",
  "projects",
  "meetings",
  "audits",
  "proposals",
  "payments",
  "roadmap",
  "messages",
];
