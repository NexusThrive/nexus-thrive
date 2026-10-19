/**
 * Roles dentro de un negocio (puro). El dueño decide todo; administración
 * maneja dinero y equipo; recepción cobra y agenda; asesor atiende clientes.
 */

export type BusinessRole = "SUPERADMIN" | "OWNER" | "ADMIN" | "RECEPTION" | "ADVISOR" | "STAFF";

export const BUSINESS_ROLES: { value: Exclude<BusinessRole, "SUPERADMIN" | "STAFF">; label: string; hint: string }[] = [
  { value: "OWNER", label: "Dueño", hint: "Todo, incluido el plan y el equipo." },
  { value: "ADMIN", label: "Administración", hint: "Dinero, inventario, equipo y reportes." },
  { value: "RECEPTION", label: "Recepción", hint: "Cobros, caja, agenda, clientes y membresías." },
  { value: "ADVISOR", label: "Asesor", hint: "Clientes, agenda y WhatsApp. Sin dinero." },
];

export function roleLabel(role: string) {
  return BUSINESS_ROLES.find((r) => r.value === role)?.label ?? (role === "SUPERADMIN" ? "NEXUS" : "Equipo");
}

const MANAGE = new Set<BusinessRole>(["SUPERADMIN", "OWNER", "ADMIN"]);
const CASH = new Set<BusinessRole>(["SUPERADMIN", "OWNER", "ADMIN", "RECEPTION", "STAFF"]);

/** Anular, editar montos, inventario, catálogo y reportes. */
export const canManage = (r: string) => MANAGE.has(r as BusinessRole);
/** Cobrar, gastos de caja y turnos de caja. */
export const canHandleCash = (r: string) => CASH.has(r as BusinessRole);
/** Invitar y retirar personas, plan y facturación de NEXUS. */
export const canManageTeam = (r: string) => r === "OWNER" || r === "SUPERADMIN" || r === "ADMIN";
