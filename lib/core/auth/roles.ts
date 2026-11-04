import { can, type BusinessPermission } from "./permissions";

/**
 * Roles dentro de un negocio (puro). El dueño decide todo; administración
 * maneja dinero y equipo; recepción cobra y agenda; asesor atiende clientes.
 */

/** El único tipo de rol del negocio (`TenantRole` y `NexusRole` son alias). */
export type BusinessRole = "SUPERADMIN" | "OWNER" | "ADMIN" | "RECEPTION" | "ADVISOR" | "STAFF";

export const BUSINESS_ROLES: { value: Exclude<BusinessRole, "SUPERADMIN" | "STAFF">; label: string; hint: string }[] = [
  { value: "OWNER", label: "Dueño", hint: "Todo, incluido el plan y el equipo." },
  { value: "ADMIN", label: "Administración", hint: "Dinero, inventario, equipo y reportes." },
  { value: "RECEPTION", label: "Recepción", hint: "Cobros, caja, agenda, clientes y membresías." },
  { value: "ADVISOR", label: "Asesor", hint: "Clientes, agenda y WhatsApp. Sin dinero." },
];

/** Roles con la jerga del gimnasio: el asesor es el entrenador y administración, el administrador. */
export const GYM_ROLES: typeof BUSINESS_ROLES = [
  { value: "OWNER", label: "Dueño", hint: "Todo, incluido el plan y el equipo." },
  { value: "ADMIN", label: "Administrador", hint: "Dinero, membresías, equipo y reportes." },
  { value: "RECEPTION", label: "Recepción", hint: "Cobros, caja, socios, membresías y control de acceso." },
  { value: "ADVISOR", label: "Entrenador", hint: "Atiende y acompaña a los socios. Sin dinero." },
];

/** Roles del negocio con el vocabulario de su rubro. */
export function rolesFor(gym?: boolean): typeof BUSINESS_ROLES {
  return gym ? GYM_ROLES : BUSINESS_ROLES;
}

/** Nombre para mostrar de un rol del negocio; «NEXUS» para el superadministrador y «Equipo» si no se reconoce. */
export function roleLabel(role: string, gym?: boolean) {
  return rolesFor(gym).find((r) => r.value === role)?.label ?? (role === "SUPERADMIN" ? "NEXUS" : "Equipo");
}

// Atajos sobre la matriz única de permisos (`./permissions`).

/** Anular, editar montos, inventario, catálogo y reportes. */
export const canManage = (r: string) => can(r, "business.manage");
/** Cobrar, gastos de caja y turnos de caja. */
export const canHandleCash = (r: string) => can(r, "money.handle");
/** Invitar y retirar personas, plan y facturación de NEXUS. */
export const canManageTeam = (r: string) => can(r, "team.manage");

/**
 * Roles del negocio (los que se ofrecen al invitar) que tienen un permiso, en el orden de `BUSINESS_ROLES`.
 * Es la fuente del texto de «sin permiso» (DR-34): el mensaje se deriva de la matriz, no se escribe a mano, así que
 * no puede quedar desactualizado si el permiso cambia.
 */
export function rolesThatCan(permission: BusinessPermission): string[] {
  return BUSINESS_ROLES.filter((r) => can(r.value, permission)).map((r) => r.label);
}

/** «Dueño», «Dueño o Administración», «Dueño, Administración o Recepción». */
export function joinRoles(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "El dueño";
  return `${labels.slice(0, -1).join(", ")} o ${labels[labels.length - 1]}`;
}

/** Texto de «sin permiso» (`06` §7): qué no puede hacer, quién sí y cómo pedirlo. */
export function accessMessage(permission: BusinessPermission, action: string): { title: string; detail: string } {
  const labels = rolesThatCan(permission);
  const verb = labels.length > 1 ? "pueden" : "puede";
  return {
    title: `No puedes ${action}.`,
    detail: `${joinRoles(labels)} ${verb} hacerlo. Pídeselo a quien administre tu negocio.`,
  };
}
