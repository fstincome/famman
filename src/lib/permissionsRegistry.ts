// Registry of all permissionable actions across modules.
// Keys are stable identifiers stored in DB (role_permissions.action_key).

export interface PermissionAction {
  key: string;
  label: { fr: string; en: string };
}

export interface PermissionModule {
  key: string;
  label: { fr: string; en: string };
  actions: PermissionAction[];
}

const crud = (prefix: string, frModule: string, enModule: string): PermissionAction[] => [
  { key: `${prefix}.view`, label: { fr: `Voir ${frModule}`, en: `View ${enModule}` } },
  { key: `${prefix}.create`, label: { fr: `Créer ${frModule}`, en: `Create ${enModule}` } },
  { key: `${prefix}.edit`, label: { fr: `Modifier ${frModule}`, en: `Edit ${enModule}` } },
  { key: `${prefix}.delete`, label: { fr: `Supprimer ${frModule}`, en: `Delete ${enModule}` } },
];

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: "dashboard",
    label: { fr: "Tableau de bord", en: "Dashboard" },
    actions: [
      { key: "dashboard.view", label: { fr: "Voir le tableau de bord", en: "View dashboard" } },
      { key: "dashboard.backup", label: { fr: "Générer un backup", en: "Generate backup" } },
      { key: "dashboard.purge", label: { fr: "Vider toutes les données", en: "Purge all data" } },
    ],
  },
  { key: "income", label: { fr: "Revenus", en: "Income" }, actions: crud("income", "un revenu", "income") },
  {
    key: "expenses",
    label: { fr: "Dépenses", en: "Expenses" },
    actions: [
      ...crud("expenses", "une dépense", "expense"),
      { key: "expenses.transfer", label: { fr: "Transférer entre enveloppes", en: "Transfer between envelopes" } },
    ],
  },
  { key: "needs", label: { fr: "Besoins", en: "Needs" }, actions: [
      ...crud("needs", "un besoin", "need"),
      { key: "needs.validate", label: { fr: "Valider un besoin", en: "Validate need" } },
    ],
  },
  { key: "debts", label: { fr: "Dettes & Créances", en: "Debts" }, actions: crud("debts", "une dette", "debt") },
  { key: "patrimony", label: { fr: "Patrimoine", en: "Patrimony" }, actions: crud("patrimony", "un actif", "asset") },
  { key: "events", label: { fr: "Événements", en: "Events" }, actions: crud("events", "un événement", "event") },
  { key: "projects", label: { fr: "Projets", en: "Projects" }, actions: crud("projects", "un projet", "project") },
  { key: "health", label: { fr: "Santé", en: "Health" }, actions: crud("health", "une entrée santé", "health entry") },
  { key: "contacts", label: { fr: "Contacts", en: "Contacts" }, actions: crud("contacts", "un contact", "contact") },
  { key: "members", label: { fr: "Membres famille", en: "Family members" }, actions: crud("members", "un membre", "member") },
  { key: "bank", label: { fr: "Comptes bancaires", en: "Bank accounts" }, actions: crud("bank", "un compte", "account") },
  { key: "recurring", label: { fr: "Transactions récurrentes", en: "Recurring" }, actions: [
      ...crud("recurring", "une récurrence", "recurring"),
      { key: "recurring.generate", label: { fr: "Générer les occurrences", en: "Generate occurrences" } },
    ],
  },
  { key: "reports", label: { fr: "Rapports", en: "Reports" }, actions: [
      { key: "reports.view", label: { fr: "Voir les rapports", en: "View reports" } },
      { key: "reports.export", label: { fr: "Exporter (PDF/Excel/CSV)", en: "Export (PDF/Excel/CSV)" } },
    ],
  },
  { key: "calendar", label: { fr: "Calendrier", en: "Calendar" }, actions: [
      { key: "calendar.view", label: { fr: "Voir le calendrier", en: "View calendar" } },
    ],
  },
  { key: "admin", label: { fr: "Administration", en: "Admin" }, actions: [
      { key: "admin.users.view", label: { fr: "Voir les membres", en: "View members" } },
      { key: "admin.users.create", label: { fr: "Créer un membre", en: "Create member" } },
      { key: "admin.permissions.manage", label: { fr: "Gérer les permissions", en: "Manage permissions" } },
    ],
  },
];

export const ALL_ACTION_KEYS = PERMISSION_MODULES.flatMap(m => m.actions.map(a => a.key));

export const FAMILY_ROLES = [
  "father", "mother", "son", "daughter", "brother", "sister",
  "uncle", "aunt", "grandfather", "grandmother", "cousin", "other",
] as const;

// Default: parents can do everything, others can only view.
export function defaultAllowed(role: string, actionKey: string): boolean {
  if (role === "father" || role === "mother") return true;
  return actionKey.endsWith(".view");
}
