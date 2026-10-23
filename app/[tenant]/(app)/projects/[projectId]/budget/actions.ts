"use server";

import { buildBudgetWorkbook } from "@/lib/construction/budget-export";
import { tenantLetterhead } from "@/lib/tenant/membership";
import { revalidatePath } from "next/cache";
import { decimalToMicro } from "@/lib/construction/apu-engine";
import type {
  ApuActivityDetail,
  ApuActivityRow,
  ProjectBudgetData,
} from "@/lib/tenant/db";
import {
  canGovernBudget,
  requireTenantContext,
} from "@/lib/tenant/context";
import {
  validateAiuConfig,
  validateCreateBudgetItem,
  validateCreateChapter,
  validateUpdateResource,
  type AiuFieldErrors,
  type AiuFormValues,
  type BudgetItemFieldErrors,
  type BudgetItemFormValues,
  type ChapterFieldErrors,
  type ChapterFormValues,
} from "./validators";

/* ------------------------------------------------------------------ */
/* Tipos de estado (firma useActionState)                              */
/* ------------------------------------------------------------------ */

export type ChapterFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: ChapterFieldErrors;
  values?: ChapterFormValues;
};

export type BudgetItemFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: BudgetItemFieldErrors;
  values?: BudgetItemFormValues;
};

export type AiuFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: AiuFieldErrors;
  values?: AiuFormValues;
};

const ACCESS_DENIED_FORM = {
  status: "error",
  message: "No tienes acceso a este negocio.",
} as const;

const FORBIDDEN_FORM = {
  status: "error",
  message: "No tienes permisos para esta acción (solo OWNER o SUPERADMIN).",
} as const;

/**
 * Lee la revisión esperada del formulario (token de concurrencia optimista).
 * Devuelve `undefined` si el campo falta o no es un entero positivo, para no
 * bloquear envíos legítimos de formularios antiguos.
 */
function readExpectedRevision(formData: FormData): number | undefined {
  const raw = Number(formData.get("expectedRevision"));
  return Number.isInteger(raw) && raw > 0 ? raw : undefined;
}

/** Traduce los errores del tenant-db a mensajes de formulario legibles. */
function toFormError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    if (error.message === "STALE_REVISION") {
      return "El presupuesto cambió desde que abriste esta página. Recargá e intentá de nuevo.";
    }
    return error.message;
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Lectura / creación del presupuesto                                  */
/* ------------------------------------------------------------------ */

/**
 * Devuelve el presupuesto del proyecto creándolo si no existe (1:1). Pensado
 * para la carga del Tab 2 en el servidor: `null` si no hay acceso.
 */
export async function getOrCreateProjectBudgetAction(
  tenantSlug: string,
  projectId: string,
): Promise<ProjectBudgetData | null> {
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context || !projectId) {
    return null;
  }
  try {
    return await context.tenantDb.budgets.getOrCreate(projectId);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Capítulos                                                           */
/* ------------------------------------------------------------------ */

export async function createChapterAction(
  _prevState: ChapterFormState,
  formData: FormData,
): Promise<ChapterFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!projectId) {
    return { status: "error", message: "Proyecto no válido." };
  }

  const validation = validateCreateChapter(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  try {
    await context.tenantDb.budgets.createChapter(projectId, validation.input);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo crear el capítulo.",
      values: validation.values,
    };
  }

  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { status: "ok", message: "Capítulo creado." };
}

export async function updateChapterAction(
  _prevState: ChapterFormState,
  formData: FormData,
): Promise<ChapterFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const chapterId = String(formData.get("chapterId") ?? "");
  const expectedRevision = readExpectedRevision(formData);
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!projectId || !chapterId) {
    return { status: "error", message: "Capítulo no válido." };
  }

  const validation = validateCreateChapter(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  try {
    await context.tenantDb.budgets.updateChapter(
      projectId,
      chapterId,
      {
        name: validation.input.name,
        description: validation.input.description ?? null,
      },
      expectedRevision,
    );
  } catch (error) {
    return {
      status: "error",
      message: toFormError(error, "No se pudo actualizar el capítulo."),
      values: validation.values,
    };
  }

  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { status: "ok", message: "Capítulo actualizado." };
}

/* ------------------------------------------------------------------ */
/* Partidas                                                            */
/* ------------------------------------------------------------------ */

export async function createBudgetItemAction(
  _prevState: BudgetItemFormState,
  formData: FormData,
): Promise<BudgetItemFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!projectId) {
    return { status: "error", message: "Proyecto no válido." };
  }

  const validation = validateCreateBudgetItem(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  try {
    await context.tenantDb.budgets.createItem(projectId, validation.input);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo crear la partida.",
      values: validation.values,
    };
  }

  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { status: "ok", message: "Partida creada." };
}

export async function updateBudgetItemAction(
  _prevState: BudgetItemFormState,
  formData: FormData,
): Promise<BudgetItemFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const expectedRevision = readExpectedRevision(formData);
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!projectId || !itemId) {
    return { status: "error", message: "Partida no válida." };
  }

  const validation = validateCreateBudgetItem(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  try {
    await context.tenantDb.budgets.updateItem(
      projectId,
      itemId,
      {
        code: validation.input.code,
        description: validation.input.description,
        unit: validation.input.unit,
        quantity: validation.input.quantity,
        unitCostDirect: validation.input.unitCostDirect,
      },
      expectedRevision,
    );
  } catch (error) {
    return {
      status: "error",
      message: toFormError(error, "No se pudo actualizar la partida."),
      values: validation.values,
    };
  }

  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { status: "ok", message: "Partida actualizada." };
}

/* ------------------------------------------------------------------ */
/* Configuración AIU                                                   */
/* ------------------------------------------------------------------ */

export async function updateAiuConfigAction(
  _prevState: AiuFormState,
  formData: FormData,
): Promise<AiuFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!canGovernBudget(context.role)) {
    return FORBIDDEN_FORM;
  }
  if (!projectId) {
    return { status: "error", message: "Proyecto no válido." };
  }

  const validation = validateAiuConfig(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  try {
    await context.tenantDb.budgets.updateAiu(projectId, validation.input);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el AIU.",
      values: validation.values,
    };
  }

  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { status: "ok", message: "Configuración AIU actualizada." };
}

/* ------------------------------------------------------------------ */
/* Bloqueo del presupuesto                                             */
/* ------------------------------------------------------------------ */

export async function toggleBudgetLockAction(
  tenantSlug: string,
  projectId: string,
  isLocked: boolean,
  reason?: string,
): Promise<{ ok: boolean; message?: string }> {
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context || !projectId) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  if (!canGovernBudget(context.role)) {
    return { ok: false, message: "Solo OWNER o SUPERADMIN pueden bloquear el presupuesto." };
  }
  if (!isLocked && (reason === undefined || reason.trim() === "")) {
    return { ok: false, message: "Desbloqueo requiere un motivo." };
  }
  try {
    await context.tenantDb.budgets.setLocked(projectId, isLocked, undefined, reason?.trim(), context.userId);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el bloqueo.",
    };
  }
  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Eliminación de capítulos / partidas                                 */
/* ------------------------------------------------------------------ */

/**
 * Elimina un capítulo (y sus partidas). Permitido a cualquier miembro
 * mientras el presupuesto no esté bloqueado (guardas en tenant-db).
 */
export async function deleteChapterAction(
  tenantSlug: string,
  projectId: string,
  chapterId: string,
): Promise<{ ok: boolean; message?: string }> {
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context || !projectId || !chapterId) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  try {
    await context.tenantDb.budgets.deleteChapter(projectId, chapterId);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el capítulo.",
    };
  }
  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { ok: true };
}

/**
 * Elimina una partida (y sus recursos). Permitido a cualquier miembro
 * mientras el presupuesto no esté bloqueado (guardas en tenant-db).
 */
export async function deleteBudgetItemAction(
  tenantSlug: string,
  projectId: string,
  itemId: string,
): Promise<{ ok: boolean; message?: string }> {
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context || !projectId || !itemId) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  try {
    await context.tenantDb.budgets.deleteItem(projectId, itemId);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la partida.",
    };
  }
  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Línea base (D1)                                                     */
/* ------------------------------------------------------------------ */

/**
 * Aprueba una línea base del presupuesto (congela revisión, totales y
 * conteos). Solo OWNER o SUPERADMIN (D7). Permitido aunque esté bloqueado.
 */
export async function approveBudgetBaselineAction(
  tenantSlug: string,
  projectId: string,
  note?: string,
): Promise<{ ok: boolean; message?: string }> {
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context || !projectId) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  if (!canGovernBudget(context.role)) {
    return {
      ok: false,
      message: "Solo OWNER o SUPERADMIN pueden aprobar la línea base.",
    };
  }
  try {
    const member = await context.tenantDb.users.findByClerkUserId(
      context.userId,
    );
    await context.tenantDb.budgets.approveBaseline(projectId, {
      userId: context.userId,
      userName: member?.name?.trim() || member?.email || "Usuario",
      note,
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo aprobar la línea base.",
    };
  }
  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Importación desde el catálogo APU (Etapa 3)                         */
/* ------------------------------------------------------------------ */

/** Cantidad por defecto de una partida importada: 1.000000 unidad. */
const DEFAULT_QUANTITY_MICRO = BigInt(1_000_000);

/**
 * Busca actividades **vigentes** del catálogo APU para el importador del
 * presupuesto. Lee el catálogo del mismo tenant (aislado por `requireTenantContext`).
 * Devuelve `null` cuando no hay acceso (el caller trata como error genérico).
 */
export async function searchCatalogActivitiesAction(
  tenantSlug: string,
  query: string,
  unit?: string,
): Promise<ApuActivityRow[] | null> {
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context) {
    return null;
  }
  const { rows } = await context.tenantDb.apu.listActivities({
    q: query,
    unit: unit && unit.trim() !== "" ? unit.trim() : undefined,
    active: true,
    limit: 50,
  });
  return rows;
}

/** Detalle de una actividad del catálogo (composición para la vista previa). */
export async function getCatalogActivityDetailAction(
  tenantSlug: string,
  activityId: string,
): Promise<ApuActivityDetail | null> {
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context || !activityId) {
    return null;
  }
  return context.tenantDb.apu.getActivity(activityId);
}

/**
 * Importa una actividad del catálogo como partida del presupuesto: crea el
 * `BudgetItem` y congela su composición como recursos (`BudgetItemResource`)
 * con los precios del catálogo en este instante. La cantidad llega como
 * decimal legible (p. ej. "12.5") y se escala a micro-unidades; vacía = 1.
 *
 * El presupuesto se deriva del proyecto (relación 1:1) — no se recibe `budgetId`.
 */
export async function importActivityFromCatalogAction(
  tenantSlug: string,
  projectId: string,
  chapterId: string,
  activityId: string,
  quantity: string,
  expectedRevision?: number,
): Promise<{ ok: boolean; message?: string; itemId?: string }> {
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  if (!projectId || !chapterId || !activityId) {
    return { ok: false, message: "Datos de importación incompletos." };
  }

  const rawQuantity = quantity.trim();
  const quantityMicro =
    rawQuantity === "" ? DEFAULT_QUANTITY_MICRO : decimalToMicro(rawQuantity);
  if (quantityMicro === null || quantityMicro <= BigInt(0)) {
    return { ok: false, message: "La cantidad debe ser mayor a cero." };
  }

  try {
    const { id } = await context.tenantDb.budgets.importActivityFromCatalog(
      projectId,
      chapterId,
      activityId,
      quantityMicro,
      expectedRevision,
    );
    revalidatePath(`/${tenantSlug}/projects/${projectId}`);
    return { ok: true, itemId: id };
  } catch (error) {
    return {
      ok: false,
      message: toFormError(error, "No se pudo importar la actividad."),
    };
  }
}

/* ------------------------------------------------------------------ */
/* Compositor de APU — edición de líneas de recurso (Etapa 3)          */
/* ------------------------------------------------------------------ */

/**
 * Actualiza una línea de APU (`performance` y `wastePct`) desde el compositor
 * interactivo. Los valores llegan como decimales legibles (p. ej. "1.5" y
 * "10"); vacíos se rechazan (el modal valida antes). Devuelve la nueva
 * revisión del presupuesto para encadenar ediciones sin `STALE_REVISION`.
 */
export async function updateResourceAction(
  tenantSlug: string,
  projectId: string,
  resourceId: string,
  performance: string,
  wastePct: string,
  expectedRevision?: number,
): Promise<{ ok: boolean; message?: string; revision?: number }> {
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  if (!projectId || !resourceId) {
    return { ok: false, message: "Línea de APU no válida." };
  }

  const validation = validateUpdateResource(performance, wastePct);
  if (!validation.ok) {
    const firstError =
      Object.values(validation.errors).find((msg) => Boolean(msg)) ??
      "Revisá el rendimiento y el desperdicio.";
    return { ok: false, message: firstError };
  }

  try {
    const { revision } = await context.tenantDb.budgets.updateResource(
      projectId,
      resourceId,
      validation.input,
      expectedRevision,
    );
    revalidatePath(`/${tenantSlug}/projects/${projectId}`);
    return { ok: true, revision };
  } catch (error) {
    return {
      ok: false,
      message: toFormError(error, "No se pudo actualizar la línea de APU."),
    };
  }
}

/**
 * Exporta el presupuesto de la obra a Excel (hojas Presupuesto y APU).
 * Devuelve el archivo en base64 para que el navegador lo descargue.
 */
export async function exportBudgetXlsxAction(
  tenantSlug: string,
  projectId: string,
): Promise<{ ok: true; filename: string; base64: string } | { ok: false; message: string }> {
  const context = await requireTenantContext(tenantSlug, "/projects");
  if (!context) return { ok: false, message: "No tienes acceso a este negocio." };
  const [project, budget] = await Promise.all([
    context.tenantDb.projects.get(projectId),
    context.tenantDb.budgets.get(projectId),
  ]);
  if (!project || !budget) return { ok: false, message: "No se encontró el presupuesto de esta obra." };
  const tenant = await tenantLetterhead(context.tenantId);
  const generatedOn = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  const bytes = buildBudgetWorkbook({
    budget,
    projectCode: project.code,
    projectName: project.name,
    customerName: project.customerName,
    issuerName: tenant?.legalName?.trim() || tenant?.name || null,
    generatedOn,
  });
  return {
    ok: true,
    filename: `${budget.code}-${project.code}.xlsx`,
    base64: Buffer.from(bytes).toString("base64"),
  };
}
