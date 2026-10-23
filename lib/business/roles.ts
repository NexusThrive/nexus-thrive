import { can } from "./permissions";

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

export function roleLabel(role: string) {
  return BUSINESS_ROLES.find((r) => r.value === role)?.label ?? (role === "SUPERADMIN" ? "NEXUS" : "Equipo");
}

// Atajos sobre la matriz única de permisos (`./permissions`).

/** Anular, editar montos, inventario, catálogo y reportes. */
export const canManage = (r: string) => can(r, "business.manage");
/** Cobrar, gastos de caja y turnos de caja. */
export const canHandleCash = (r: string) => can(r, "money.handle");
/** Invitar y retirar personas, plan y facturación de NEXUS. */
export const canManageTeam = (r: string) => can(r, "team.manage");
