/**
 * Permisos del NEXUS Operations Center. Cada acción del panel se verifica en
 * el servidor contra estas claves (ocultar un botón no es seguridad). Los
 * roles guardan una lista de claves; este archivo es la única fuente.
 */

export const PERMISSION_GROUPS = [
  {
    key: "sales",
    label: "Comercial",
    permissions: [
      { key: "leads.view", label: "Ver leads" },
      { key: "leads.edit", label: "Crear y editar leads" },
      { key: "leads.assign", label: "Asignar oportunidades" },
      { key: "proposals.view", label: "Ver propuestas" },
    ],
  },
  {
    key: "accounts",
    label: "Negocios",
    permissions: [
      { key: "accounts.view", label: "Consultar cuentas" },
      { key: "accounts.edit", label: "Editar datos comerciales" },
      { key: "accounts.create", label: "Crear negocios" },
      { key: "accounts.modules", label: "Activar módulos" },
      { key: "accounts.suspend", label: "Suspender o reactivar cuentas" },
      { key: "accounts.impersonate", label: "Entrar como el negocio" },
    ],
  },
  {
    key: "finance",
    label: "Finanzas",
    permissions: [
      { key: "billing.view", label: "Consultar cobros" },
      { key: "billing.record", label: "Registrar pagos manuales" },
      { key: "billing.refund", label: "Gestionar reembolsos" },
      { key: "pricing.edit", label: "Cambiar precios y planes" },
    ],
  },
  {
    key: "support",
    label: "Soporte",
    permissions: [
      { key: "tickets.view", label: "Ver tickets" },
      { key: "tickets.reply", label: "Responder al cliente" },
      { key: "tickets.escalate", label: "Escalar incidencias" },
      { key: "diagnostics.view", label: "Acceder al diagnóstico técnico" },
    ],
  },
  {
    key: "admin",
    label: "Administración",
    permissions: [
      { key: "team.invite", label: "Invitar integrantes" },
      { key: "team.roles", label: "Asignar roles" },
      { key: "team.permissions", label: "Crear roles y modificar permisos" },
      { key: "audit.view", label: "Consultar auditoría" },
      { key: "catalog.edit", label: "Configurar rubros, módulos y onboarding" },
    ],
  },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

export function isPermission(value: string): value is PermissionKey {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

/** Solo claves válidas, sin repetir y en el orden del catálogo. */
export function normalizePermissions(values: readonly string[]): PermissionKey[] {
  const set = new Set(values);
  return ALL_PERMISSIONS.filter((p) => set.has(p));
}

/** Permisos que nunca puede perder el rol de Propietario (evita quedarse sin dueño). */
export const OWNER_ROLE_KEY = "owner";

export type SystemRole = { key: string; name: string; description: string; permissions: PermissionKey[] };

export const SYSTEM_ROLES: SystemRole[] = [
  {
    key: OWNER_ROLE_KEY,
    name: "Propietario",
    description: "Control total del Operations Center: equipo, permisos, precios, cuentas y auditoría.",
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "finance",
    name: "Finanzas",
    description: "Ingresos, cobros, suscripciones y reportes. Sin acceso a la configuración técnica.",
    permissions: ["accounts.view", "billing.view", "billing.record", "billing.refund", "pricing.edit", "audit.view"],
  },
  {
    key: "sales",
    name: "Comercial",
    description: "Leads, propuestas y oportunidades; consulta de cuentas sin permisos financieros.",
    permissions: ["leads.view", "leads.edit", "leads.assign", "proposals.view", "accounts.view", "accounts.create"],
  },
  {
    key: "support",
    name: "Soporte",
    description: "Tickets, respuestas y diagnóstico de los negocios. No cambia precios ni permisos.",
    permissions: ["accounts.view", "tickets.view", "tickets.reply", "tickets.escalate", "diagnostics.view"],
  },
  {
    key: "ops",
    name: "Técnico",
    description: "Diagnóstico y mantenimiento: módulos, estado de cuentas e incidencias escaladas.",
    permissions: ["accounts.view", "accounts.modules", "accounts.suspend", "tickets.view", "tickets.escalate", "diagnostics.view", "audit.view"],
  },
];

export function can(granted: readonly string[], permission: PermissionKey): boolean {
  return granted.includes(permission);
}

/** Un rol no puede conceder lo que quien lo edita no tiene (escalada de privilegios). */
export function canGrantAll(editor: readonly string[], requested: readonly string[]): boolean {
  return requested.every((p) => editor.includes(p));
}
