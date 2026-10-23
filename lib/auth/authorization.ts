/**
 * Guardia de autorización de construcción (Etapa 1, D7).
 *
 * Recibe el contexto del tenant y devuelve una verificación por acción. Las
 * reglas viven en la matriz única `lib/business/permissions.ts`; esto solo
 * les da nombres de acción para que las actions importen un módulo.
 */

import type { BusinessRole } from "@/lib/business/roles";
import { can, type BusinessPermission } from "@/lib/business/permissions";

/** Rol del usuario en el negocio (alias del único tipo, `BusinessRole`). */
export type NexusRole = BusinessRole;

/** Contexto mínimo que la action ya resolvió (via requireTenantContext). */
export type AuthContext = {
  userId: string;
  tenantId: string;
  role: NexusRole;
};

/** Resultado de una verificación de permiso. */
export type AuthResult =
  | { ok: true }
  | { ok: false; reason: "FORBIDDEN" | "NOT_OWNER" | "NOT_SUPERADMIN" };

/**
 * Crea las funciones de autorización a partir del contexto. Cada una consulta
 * la matriz única (`lib/business/permissions.ts`).
 * Uso típico en una action:
 *   const { canApproveBaseline, canEditBudget, canChangeProjectStatus } = createAuth(context);
 *   if (!canApproveBaseline().ok) return { ok: false, message: "Solo OWNER" };
 */
export function createAuth(context: AuthContext) {
  const { role } = context;
  const check =
    (permission: BusinessPermission, reason: "FORBIDDEN" | "NOT_OWNER" = "FORBIDDEN") =>
    (): AuthResult =>
      can(role, permission) ? { ok: true } : { ok: false, reason };

  return {
    // Presupuesto (D7)
    canApproveBaseline: check("budget.govern"),
    canToggleLock: check("budget.govern"),
    canEditAiu: check("budget.govern"),
    canCreateChapter: check("budget.edit"),
    canCreateItem: check("budget.edit"),
    canUpdateChapter: check("budget.edit"),
    canUpdateItem: check("budget.edit"),
    canDeleteChapter: check("budget.edit"),
    canDeleteItem: check("budget.edit"),
    canVerifyTotals: check("budget.edit"),
    // Catálogo APU: editar lo hace el equipo; archivar y borrar, quien gobierna.
    canEditApuCatalog: check("apu.edit"),
    canManageApuCatalogDestructive: check("apu.destroy"),
    // Proyecto
    canChangeProjectStatus: check("projects.changeStatus", "NOT_OWNER"),
    canEditProjectContent: check("projects.editContent"),
    canCreateProject: check("projects.create", "NOT_OWNER"),
    canUpdateProjectHeader: check("projects.editHeader"),
    // Bitácora
    canCreateFieldLogEntry: check("fieldLog.create"),
    canDeleteFieldLogEntry: check("fieldLog.delete", "NOT_OWNER"),
    // Lean
    canCreateLookaheadTask: check("lean.plan"),
    canCreateWeeklyCommitment: check("lean.plan"),
  };
}

/** Helper directo sin crear el objeto completo. */
export function canGovernBudgetRole(role: NexusRole): boolean {
  return can(role, "budget.govern");
}

/** Mapa de acción → descripción para logs/debug. */
export const ACTION_DESCRIPTIONS: Record<string, string> = {
  approveBaseline: "aprobar línea base",
  toggleLock: "bloquear/desbloquear presupuesto",
  editAiu: "editar AIU",
  createChapter: "crear capítulo",
  createItem: "crear partida",
  updateChapter: "editar capítulo",
  updateItem: "editar partida",
  deleteChapter: "borrar capítulo",
  deleteItem: "borrar partida",
  verifyTotals: "verificar totales",
  editApuCatalog: "crear/editar insumos, actividades y composiciones",
  manageApuCatalogDestructive: "archivar/borrar del catálogo APU",
  changeProjectStatus: "cambiar estado del proyecto",
  editProjectContent: "editar nombre/descripción del proyecto",
  createProject: "crear proyecto",
  updateProjectHeader: "editar ficha del proyecto",
  createFieldLogEntry: "crear anotación de bitácora",
  deleteFieldLogEntry: "borrar anotación de bitácora",
  createLookaheadTask: "crear tarea de lookahead",
  createWeeklyCommitment: "crear compromiso semanal",
};