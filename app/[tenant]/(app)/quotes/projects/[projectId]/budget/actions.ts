"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import {
  createTenantDb,
  type ProjectBudgetData,
} from "@/lib/tenant-db";
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

type TenantDb = ReturnType<typeof createTenantDb>;

type TenantContext = {
  tenantId: string;
  tenantDb: TenantDb;
};

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario.
 * Devuelve `null` cuando algo falla (el caller responde con error genérico).
 */
async function requireTenantContext(
  tenantSlug: string,
): Promise<TenantContext | null> {
  if (!tenantSlug || tenantSlug.trim() === "") {
    return null;
  }
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    return null;
  }
  const tenantDb = createTenantDb(tenantRecord.id);
  const member = await tenantDb.users.findByClerkUserId(userId);
  if (!member) {
    return null;
  }
  return { tenantId: tenantRecord.id, tenantDb };
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
