import type { BusinessRole } from "./roles";

/**
 * Matriz única de permisos dentro de un negocio (SEC-05 en
 * docs/nexus-architecture/security-audit.md). Pura: sirve en el servidor y en
 * el navegador (para ocultar botones), pero la decisión que cuenta es la del
 * servidor en cada acción.
 *
 * Toda regla "¿puede este rol…?" sale de aquí. `canManage`, `canHandleCash`,
 * `canGovernBudget`, `createAuth`… son atajos sobre esta tabla. Un permiso
 * nuevo se agrega aquí y se cubre en `permissions.test.ts`.
 */

const GOVERN = ["SUPERADMIN", "OWNER", "ADMIN"] as const;
const GOVERN_AND_STAFF = [...GOVERN, "STAFF"] as const;

export const BUSINESS_PERMISSIONS = {
  // --- Negocio ---
  /** Anular, editar montos, inventario, catálogo y reportes. */
  "business.manage": GOVERN,
  /** Invitar y retirar personas, plan y facturación de NEXUS. */
  "team.manage": GOVERN,
  /** Configurar el negocio en el onboarding: plan, módulos y enlace. */
  "business.setup": ["SUPERADMIN", "OWNER"],
  /** Cobrar (incluye vender y renovar membresías), gastos y turnos de caja. */
  "money.handle": ["SUPERADMIN", "OWNER", "ADMIN", "RECEPTION", "STAFF"],
  /** Importar y exportar clientes y catálogo (los datos del negocio entran y salen en masa). */
  "data.exchange": GOVERN,
  /** Borrar o archivar clientes. */
  "customers.delete": GOVERN,

  // --- Construcción: presupuesto (D7) ---
  /** Bloquear/desbloquear, AIU y aprobar la línea base. */
  "budget.govern": GOVERN,
  /** Capítulos, partidas y verificación de totales. */
  "budget.edit": GOVERN_AND_STAFF,

  // --- Construcción: catálogo APU ---
  "apu.edit": GOVERN_AND_STAFF,
  /** Archivar y borrar del catálogo (destructivo). */
  "apu.destroy": GOVERN,

  // --- Construcción: proyectos ---
  "projects.create": ["SUPERADMIN", "OWNER"],
  "projects.changeStatus": GOVERN,
  /** Nombre y descripción. Recepción no edita obras. */
  "projects.editContent": ["SUPERADMIN", "OWNER", "STAFF", "ADMIN", "ADVISOR"],
  "projects.editHeader": GOVERN_AND_STAFF,

  // --- Construcción: bitácora y Lean ---
  "fieldLog.create": ["SUPERADMIN", "OWNER", "ADMIN", "RECEPTION", "ADVISOR", "STAFF"],
  "fieldLog.delete": ["SUPERADMIN", "OWNER"],
  "lean.plan": GOVERN_AND_STAFF,
} as const satisfies Record<string, readonly BusinessRole[]>;

export type BusinessPermission = keyof typeof BUSINESS_PERMISSIONS;

/** ¿El rol tiene el permiso? Un rol desconocido no tiene ninguno. */
export function can(role: string, permission: BusinessPermission): boolean {
  return (BUSINESS_PERMISSIONS[permission] as readonly string[]).includes(role);
}
