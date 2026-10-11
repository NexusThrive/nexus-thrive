"use server";

import { revalidatePath } from "next/cache";
import { type ProjectBudgetData } from "@/lib/tenant-db";
import {
  canGovernBudget,
  requireTenantContext,
} from "@/lib/tenant-context";
import {
  validateAiuConfig,
  validateCreateBudgetItem,
  validateCreateChapter,
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
  const context = await requireTenantContext(tenantSlug);
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
  const context = await requireTenantContext(tenantSlug);
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

  revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
  return { status: "ok", message: "Capítulo creado." };
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
  const context = await requireTenantContext(tenantSlug);
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

  revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
  return { status: "ok", message: "Partida creada." };
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
  const context = await requireTenantContext(tenantSlug);
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

  revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
  return { status: "ok", message: "Configuración AIU actualizada." };
}

/* ------------------------------------------------------------------ */
/* Bloqueo del presupuesto                                             */
/* ------------------------------------------------------------------ */

export async function toggleBudgetLockAction(
  tenantSlug: string,
  projectId: string,
  isLocked: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const context = await requireTenantContext(tenantSlug);
  if (!context || !projectId) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  if (!canGovernBudget(context.role)) {
    return { ok: false, message: "Solo OWNER o SUPERADMIN pueden bloquear el presupuesto." };
  }
  try {
    await context.tenantDb.budgets.setLocked(projectId, isLocked);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el bloqueo.",
    };
  }
  revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
  return { ok: true };
}
