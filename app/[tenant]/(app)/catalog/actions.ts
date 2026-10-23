"use server";

import { readImageUpload } from "@/lib/image-upload";
import { requireTenantContext } from "@/lib/tenant/context";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";
import { createAuth, type NexusRole } from "@/lib/auth/authorization";
import { getQuoteTerms, type QuoteTerms } from "@/lib/vertical-terms";
import type { ApuItemCategoryValue } from "@/lib/construction/apu-engine";
import {
  validateApuActivity,
  validateApuItem,
  validateComposition,
  parseImportCsv,
  type ApuActivityFieldErrors,
  type ApuActivityFormValues,
  type ApuItemFieldErrors,
  type ApuItemFormValues,
} from "./validators";

/* ------------------------------------------------------------------ */
/* Tipos de estado (firma useActionState)                              */
/* ------------------------------------------------------------------ */

export type ApuItemFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: ApuItemFieldErrors;
  values?: ApuItemFormValues;
};

export type ApuActivityFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: ApuActivityFieldErrors;
  values?: ApuActivityFormValues;
};

export type ImportResultState = {
  status: "idle" | "error" | "ok";
  message?: string;
  created?: number;
  updated?: number;
};

/** Estado de las acciones de mutación del catálogo (archivar, borrar, composición). */
export type ApuMutationState = {
  status: "idle" | "error" | "ok";
  message?: string;
};

const ACCESS_DENIED_FORM = { status: "error", message: "No tienes acceso a este negocio." } as const;

const FORBIDDEN_FORM = {
  status: "error",
  message: "No tienes permisos para esta acción (solo OWNER o SUPERADMIN).",
} as const;

type TenantDb = ReturnType<typeof createTenantDb>;

/** DB del tenant + rol + vocabulario cotizaciones (mensajes adaptativos). */
type TenantContext = {
  userId: string;
  tenantId: string;
  role: NexusRole;
  tenantDb: TenantDb;
  terms: QuoteTerms;
};

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario.
 * Devuelve `null` cuando algo falla (el caller responde con mensaje genérico).
 */
async function actionContext(
  tenantSlug: string,
): Promise<TenantContext | null> {
  const context = await requireTenantContext(tenantSlug, "/catalog");
  if (!context) {
    return null;
  }
  return {
    userId: context.userId,
    tenantId: context.tenantId,
    role: context.role as NexusRole,
    tenantDb: context.tenantDb,
    terms: getQuoteTerms(context.vertical),
  };
}

/** Detecta violación de clave única (código duplicado en el tenant). */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    /duplicate key value violates unique constraint/i.test(error.message)
  );
}

const DUPLICATE_CODE_MESSAGE =
  "Ya existe un ítem con ese código en este negocio. Usa otro código o déjalo vacío.";

/** Códigos de error de la capa de datos APU → mensajes de UI. */
const APU_ERROR_MESSAGES: Record<string, string> = {
  APU_NOT_FOUND: "No se encontró el registro en este negocio.",
  APU_IN_USE:
    "No se puede borrar: está en uso en actividades o presupuestos. Archívalo en su lugar.",
  APU_FOREIGN_ITEM: "El insumo no pertenece a este negocio.",
  APU_DUPLICATE: "Ese insumo ya está en la composición de la actividad.",
  APU_INVALID_CONSUMPTION: "El rendimiento debe ser mayor a cero.",
  APU_INVALID_WASTE: "El desperdicio debe estar entre 0% y 50%.",
};

/** Traduce un error de la capa de datos APU a un mensaje legible. */
function apuErrorMessage(error: unknown): string {
  if (error instanceof Error && APU_ERROR_MESSAGES[error.message]) {
    return APU_ERROR_MESSAGES[error.message];
  }
  if (isUniqueViolation(error)) {
    return "Registro duplicado (código o composición ya existente).";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "No se pudo completar la operación.";
}

/** Fábrica de autorización a partir del contexto resuelto. */
function authFor(context: TenantContext) {
  return createAuth({
    userId: context.userId,
    tenantId: context.tenantId,
    role: context.role,
  });
}

/* ------------------------------------------------------------------ */
/* Banco de insumos — ítems                                            */
/* ------------------------------------------------------------------ */

export async function createApuItemAction(
  _prevState: ApuItemFormState,
  formData: FormData,
): Promise<ApuItemFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb } = context;
  if (!authFor(context).canEditApuCatalog().ok) {
    return FORBIDDEN_FORM;
  }

  const validation = validateApuItem(formData);
  if (!validation.ok) {
    return { status: "error", errors: validation.errors, values: validation.values };
  }
  const photo = await readImageUpload(formData, "imageFile");
  if (photo.status === "error") {
    return { status: "error", errors: { imageUrl: photo.message }, values: validation.values };
  }

  try {
    const imageId =
      photo.status === "ok" ? await tenantDb.apu.storeImage(photo.data, photo.mimeType) : undefined;
    await tenantDb.apu.createItem({
      imageId,
      code: validation.values.code || undefined,
      name: validation.values.name,
      unit: validation.values.unit,
      category: validation.values.category as ApuItemCategoryValue,
      unitPrice: validation.values.unitPrice,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "error", message: DUPLICATE_CODE_MESSAGE, values: validation.values };
    }
    throw error;
  }

  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok" };
}

export async function updateApuItemAction(
  _prevState: ApuItemFormState,
  formData: FormData,
): Promise<ApuItemFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb } = context;
  if (!authFor(context).canEditApuCatalog().ok) {
    return FORBIDDEN_FORM;
  }

  if (!itemId) {
    return { status: "error", message: "Ítem no válido." };
  }

  const validation = validateApuItem(formData);
  if (!validation.ok) {
    return { status: "error", errors: validation.errors, values: validation.values };
  }
  const photo = await readImageUpload(formData, "imageFile");
  if (photo.status === "error") {
    return { status: "error", errors: { imageUrl: photo.message }, values: validation.values };
  }

  try {
    if (photo.status === "ok") {
      const imageId = await tenantDb.apu.storeImage(photo.data, photo.mimeType);
      await tenantDb.apu.updateItem(itemId, { imageId });
    }
    await tenantDb.apu.updateItem(itemId, {
      code: validation.values.code || undefined,
      name: validation.values.name,
      unit: validation.values.unit,
      category: validation.values.category as ApuItemCategoryValue,
      unitPrice: validation.values.unitPrice,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "error", message: DUPLICATE_CODE_MESSAGE, values: validation.values };
    }
    throw error;
  }

  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok" };
}

/* ------------------------------------------------------------------ */
/* Catálogo APU — actividades                                          */
/* ------------------------------------------------------------------ */

export async function createApuActivityAction(
  _prevState: ApuActivityFormState,
  formData: FormData,
): Promise<ApuActivityFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb } = context;
  if (!authFor(context).canEditApuCatalog().ok) {
    return FORBIDDEN_FORM;
  }

  const validation = validateApuActivity(formData);
  if (!validation.ok) {
    return { status: "error", errors: validation.errors, values: validation.values };
  }

  try {
    await tenantDb.apu.createActivity({
      code: validation.values.code || undefined,
      name: validation.values.name,
      unit: validation.values.unit,
      description: validation.values.description || undefined,
      compositions: validation.values.compositions,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: "error",
        message: "Ya existe una actividad con ese código en este negocio.",
        values: validation.values,
      };
    }
    throw error;
  }

  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok" };
}

export async function updateApuActivityAction(
  _prevState: ApuActivityFormState,
  formData: FormData,
): Promise<ApuActivityFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb } = context;
  if (!authFor(context).canEditApuCatalog().ok) {
    return FORBIDDEN_FORM;
  }

  if (!activityId) {
    return { status: "error", message: "Actividad no válida." };
  }

  const validation = validateApuActivity(formData);
  if (!validation.ok) {
    return { status: "error", errors: validation.errors, values: validation.values };
  }

  try {
    await tenantDb.apu.updateActivity(activityId, {
      code: validation.values.code || undefined,
      name: validation.values.name,
      unit: validation.values.unit,
      description: validation.values.description || undefined,
      compositions: validation.values.compositions,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: "error",
        message: "Ya existe una actividad con ese código en este negocio.",
        values: validation.values,
      };
    }
    throw error;
  }

  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok" };
}

/* ------------------------------------------------------------------ */
/* Catálogo APU — archivado, borrado y composición                     */
/* ------------------------------------------------------------------ */

export async function archiveApuItemAction(
  _prevState: ApuMutationState,
  formData: FormData,
): Promise<ApuMutationState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!authFor(context).canManageApuCatalogDestructive().ok) {
    return FORBIDDEN_FORM;
  }
  if (!itemId) {
    return { status: "error", message: "Ítem no válido." };
  }
  try {
    await context.tenantDb.apu.archiveItem(itemId);
  } catch (error) {
    return { status: "error", message: apuErrorMessage(error) };
  }
  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok", message: "Insumo archivado." };
}

export async function restoreApuItemAction(
  _prevState: ApuMutationState,
  formData: FormData,
): Promise<ApuMutationState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!authFor(context).canManageApuCatalogDestructive().ok) {
    return FORBIDDEN_FORM;
  }
  if (!itemId) {
    return { status: "error", message: "Ítem no válido." };
  }
  try {
    await context.tenantDb.apu.restoreItem(itemId);
  } catch (error) {
    return { status: "error", message: apuErrorMessage(error) };
  }
  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok", message: "Insumo restaurado." };
}

export async function deleteApuItemAction(
  _prevState: ApuMutationState,
  formData: FormData,
): Promise<ApuMutationState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!authFor(context).canManageApuCatalogDestructive().ok) {
    return FORBIDDEN_FORM;
  }
  if (!itemId) {
    return { status: "error", message: "Ítem no válido." };
  }
  try {
    await context.tenantDb.apu.deleteItem(itemId);
  } catch (error) {
    return { status: "error", message: apuErrorMessage(error) };
  }
  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok", message: "Insumo eliminado." };
}

export async function archiveApuActivityAction(
  _prevState: ApuMutationState,
  formData: FormData,
): Promise<ApuMutationState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!authFor(context).canManageApuCatalogDestructive().ok) {
    return FORBIDDEN_FORM;
  }
  if (!activityId) {
    return { status: "error", message: "Actividad no válida." };
  }
  try {
    await context.tenantDb.apu.archiveActivity(activityId);
  } catch (error) {
    return { status: "error", message: apuErrorMessage(error) };
  }
  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok", message: "Actividad archivada." };
}

export async function restoreApuActivityAction(
  _prevState: ApuMutationState,
  formData: FormData,
): Promise<ApuMutationState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!authFor(context).canManageApuCatalogDestructive().ok) {
    return FORBIDDEN_FORM;
  }
  if (!activityId) {
    return { status: "error", message: "Actividad no válida." };
  }
  try {
    await context.tenantDb.apu.restoreActivity(activityId);
  } catch (error) {
    return { status: "error", message: apuErrorMessage(error) };
  }
  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok", message: "Actividad restaurada." };
}

export async function deleteApuActivityAction(
  _prevState: ApuMutationState,
  formData: FormData,
): Promise<ApuMutationState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!authFor(context).canManageApuCatalogDestructive().ok) {
    return FORBIDDEN_FORM;
  }
  if (!activityId) {
    return { status: "error", message: "Actividad no válida." };
  }
  try {
    await context.tenantDb.apu.deleteActivity(activityId);
  } catch (error) {
    return { status: "error", message: apuErrorMessage(error) };
  }
  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok", message: "Actividad eliminada." };
}

export async function addCompositionAction(
  _prevState: ApuMutationState,
  formData: FormData,
): Promise<ApuMutationState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!authFor(context).canEditApuCatalog().ok) {
    return FORBIDDEN_FORM;
  }

  const validation = validateComposition(formData);
  if (!validation.ok) {
    return { status: "error", message: validation.error };
  }
  const { activityId, itemId, consumption, wastePercent } = validation.values;
  try {
    await context.tenantDb.apu.addComposition(activityId, {
      itemId,
      consumption,
      wastePercent,
    });
  } catch (error) {
    return { status: "error", message: apuErrorMessage(error) };
  }
  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok", message: "Insumo agregado a la composición." };
}

export async function removeCompositionAction(
  _prevState: ApuMutationState,
  formData: FormData,
): Promise<ApuMutationState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!authFor(context).canEditApuCatalog().ok) {
    return FORBIDDEN_FORM;
  }
  if (!activityId || !itemId) {
    return { status: "error", message: "Composición no válida." };
  }
  try {
    await context.tenantDb.apu.removeComposition(activityId, itemId);
  } catch (error) {
    return { status: "error", message: apuErrorMessage(error) };
  }
  revalidatePath(`/${tenantSlug}/catalog`);
  return { status: "ok", message: "Insumo quitado de la composición." };
}

/** Detalle de una actividad con composición (modal de catálogo). */
export async function getActivityDetailAction(
  tenantSlug: string,
  activityId: string,
) {
  const context = await actionContext(tenantSlug);
  if (!context) {
    return null;
  }
  const { tenantDb } = context;
  return tenantDb.apu.getActivity(activityId);
}

/** Umbrales p99 globales del catálogo (no por página). */
export async function getP99ThresholdsAction(
  tenantSlug: string,
): Promise<{
  activityUnitCost: Record<string, string>;
  itemConsumption: Record<string, string>;
  activityUnitCostMedian?: Record<string, string>;
  itemConsumptionMedian?: Record<string, string>;
  activityUnitCostP99?: Record<string, string>;
  itemConsumptionP99?: Record<string, string>;
} | null> {
  const context = await actionContext(tenantSlug);
  if (!context) {
    return null;
  }
  return context.tenantDb.apu.getP99Thresholds();
}

/** Informe de salud del catálogo APU (solo lectura). */
export async function getCatalogHealthReportAction(
  tenantSlug: string,
): Promise<{
  activitiesWithoutComposition: { id: string; code: string | null; name: string; unit: string }[];
  activitiesWithZeroUnitCost: { id: string; code: string | null; name: string; unit: string }[];
  unusedItems: { id: string; code: string | null; name: string; unit: string; updatedAt: string }[];
  priceAgeDays: { id: string; code: string | null; name: string; unit: string; ageDays: number }[];
  apuImporterStatus: { recentFiles: number; lastImport: string | null };
  apuUnitsConfigured: string[];
} | null> {
  const context = await actionContext(tenantSlug);
  if (!context) {
    return null;
  }
  return context.tenantDb.apu.getCatalogHealthReport();
}

/* ------------------------------------------------------------------ */
/* Import CSV/Excel (atómico: upsert en transacción)                   */
/* ------------------------------------------------------------------ */

export async function importApuItemsAction(
  _prevState: ImportResultState,
  formData: FormData,
): Promise<ImportResultState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await actionContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }

  const raw = String(formData.get("importText") ?? "");
  const parsed = parseImportCsv(raw);
  if (!parsed.ok) {
    return {
      status: "error",
      message: `No se importó nada: ${parsed.errors[0]}${
        parsed.errors.length > 1 ? ` (+${parsed.errors.length - 1} más)` : ""
      }`,
    };
  }

  // Upsert atómico dentro de una sola transacción; si una operación
  // falla, nada se aplica. Con código: buscar y actualizar o crear;
  // sin código: siempre crear (NULL no colisiona en la única parcial).
  try {
    const stats = await db.transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      for (const row of parsed.rows) {
        if (row.code) {
          const found = await tx.orm.public.ApuItem.where({
            tenantId: context.tenantId,
            code: row.code,
          }).first();
          if (found) {
            await tx.orm.public.ApuItem.where({ id: found.id }).update({
              name: row.name,
              unit: row.unit,
              category: row.category as ApuItemCategoryValue,
              unitPrice: row.unitPrice,
            });
            updated += 1;
          } else {
            await tx.orm.public.ApuItem.create({
              tenantId: context.tenantId,
              code: row.code,
              name: row.name,
              unit: row.unit,
              category: row.category as ApuItemCategoryValue,
              unitPrice: row.unitPrice,
            });
            created += 1;
          }
        } else {
          await tx.orm.public.ApuItem.create({
            tenantId: context.tenantId,
            code: null,
            name: row.name,
            unit: row.unit,
            category: row.category as ApuItemCategoryValue,
            unitPrice: row.unitPrice,
          });
          created += 1;
        }
      }
      return { created, updated };
    });

    revalidatePath(`/${tenantSlug}/catalog`);
    return {
      status: "ok",
      message: `${stats.created} creados, ${stats.updated} actualizados.`,
      created: stats.created,
      updated: stats.updated,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: "error",
        message:
          "No se importó nada: hay códigos duplicados entre las filas o con el catálogo actual.",
      };
    }
    throw error;
  }
}