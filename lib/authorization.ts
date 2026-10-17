/**
 * Guardia de autorización unificado (Etapa 1, D7).
 *
 * Recibe el contexto del tenant (rol, canGovernBudget, etc.) y devuelve
 * funciones de verificación por acción. Los helpers puros viven en
 * `lib/projects.ts` y `lib/tenant-context.ts`; esto los combina
 * para que las actions solo importen un módulo.
 */

import { canGovernBudget } from "@/lib/tenant-context";
import * as Projects from "@/lib/projects";

/** Rol D7 del usuario en el tenant. */
export type NexusRole = "SUPERADMIN" | "OWNER" | "STAFF";

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
 * Crea las funciones de autorización a partir del contexto.
 * Uso típico en una action:
 *   const { canApproveBaseline, canEditBudget, canChangeProjectStatus } = createAuth(context);
 *   if (!canApproveBaseline().ok) return { ok: false, message: "Solo OWNER" };
 */
export function createAuth(context: AuthContext) {
  const { role } = context;

  // --- Presupuesto (D7) ---
  const canApproveBaseline = (): AuthResult =>
    canGovernBudget(role) ? { ok: true } : { ok: false, reason: "FORBIDDEN" };

  const canToggleLock = (): AuthResult =>
    canGovernBudget(role) ? { ok: true } : { ok: false, reason: "FORBIDDEN" };

  const canEditAiu = (): AuthResult =>
    canGovernBudget(role) ? { ok: true } : { ok: false, reason: "FORBIDDEN" };

  const canCreateChapter = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF"
      ? { ok: true }
      : { ok: false, reason: "FORBIDDEN" };

  const canCreateItem = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF"
      ? { ok: true }
      : { ok: false, reason: "FORBIDDEN" };

  const canUpdateChapter = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF"
      ? { ok: true }
      : { ok: false, reason: "FORBIDDEN" };

  const canUpdateItem = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF"
      ? { ok: true }
      : { ok: false, reason: "FORBIDDEN" };

  const canDeleteChapter = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF"
      ? { ok: true }
      : { ok: false, reason: "FORBIDDEN" };

  const canDeleteItem = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF"
      ? { ok: true }
      : { ok: false, reason: "FORBIDDEN" };

  const canVerifyTotals = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF"
      ? { ok: true }
      : { ok: false, reason: "FORBIDDEN" };

  // --- Catálogo Construcción & APU ---
  /** Crear/editar insumos, actividades y sus composiciones: todo el equipo. */
  const canEditApuCatalog = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF"
      ? { ok: true }
      : { ok: false, reason: "FORBIDDEN" };

  /** Archivar y borrar del catálogo: solo OWNER/SUPERADMIN (acción destructiva). */
  const canManageApuCatalogDestructive = (): AuthResult =>
    canGovernBudget(role) ? { ok: true } : { ok: false, reason: "FORBIDDEN" };

  // --- Proyecto ---
  const canChangeProjectStatus = (): AuthResult =>
    Projects.canChangeProjectStatus(role) ? { ok: true } : { ok: false, reason: "NOT_OWNER" };

  const canEditProjectContent = (): AuthResult =>
    Projects.canEditProjectContent(role) ? { ok: true } : { ok: false, reason: "FORBIDDEN" };

  const canCreateProject = (): AuthResult =>
    role === "OWNER" || role === "SUPERADMIN" ? { ok: true } : { ok: false, reason: "NOT_OWNER" };

  const canUpdateProjectHeader = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF" ? { ok: true } : { ok: false, reason: "FORBIDDEN" };

  // --- Bitácora ---
  const canCreateFieldLogEntry = (): AuthResult =>
    ({ ok: true }); // Cualquier miembro autenticado (validado en requireTenantContext)

  const canDeleteFieldLogEntry = (): AuthResult =>
    role === "OWNER" || role === "SUPERADMIN" ? { ok: true } : { ok: false, reason: "NOT_OWNER" };

  // --- Lean ---
  const canCreateLookaheadTask = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF" ? { ok: true } : { ok: false, reason: "FORBIDDEN" };

  const canCreateWeeklyCommitment = (): AuthResult =>
    canGovernBudget(role) || role === "STAFF" ? { ok: true } : { ok: false, reason: "FORBIDDEN" };

  return {
    // Presupuesto
    canApproveBaseline,
    canToggleLock,
    canEditAiu,
    canCreateChapter,
    canCreateItem,
    canUpdateChapter,
    canUpdateItem,
    canDeleteChapter,
    canDeleteItem,
    canVerifyTotals,
    // Catálogo APU
    canEditApuCatalog,
    canManageApuCatalogDestructive,
    // Proyecto
    canChangeProjectStatus,
    canEditProjectContent,
    canCreateProject,
    canUpdateProjectHeader,
    // Bitácora
    canCreateFieldLogEntry,
    canDeleteFieldLogEntry,
    // Lean
    canCreateLookaheadTask,
    canCreateWeeklyCommitment,
  };
}

/** Helper directo sin crear el objeto completo. */
export function canGovernBudgetRole(role: NexusRole): boolean {
  return canGovernBudget(role);
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