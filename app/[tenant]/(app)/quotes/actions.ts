"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { getQuoteTerms, type QuoteTerms } from "@/lib/vertical-terms";
import type { ApuItemCategoryValue } from "@/lib/apu-engine";
import {
  validateApuActivity,
  validateApuItem,
  validateQuote,
  parseImportCsv,
  type ApuActivityFieldErrors,
  type ApuActivityFormValues,
  type ApuItemFieldErrors,
  type ApuItemFormValues,
  type QuoteFieldErrors,
  type QuoteFormValues,
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

export type QuoteFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: QuoteFieldErrors;
  values?: QuoteFormValues;
};

export type ImportResultState = {
  status: "idle" | "error" | "ok";
  message?: string;
  created?: number;
  updated?: number;
};

const ACCESS_DENIED_FORM = { status: "error", message: "No tienes acceso a este negocio." } as const;

type TenantDb = ReturnType<typeof createTenantDb>;

/** DB del tenant + vocabulario cotizaciones (mensajes adaptativos). */
type TenantContext = {
  tenantId: string;
  tenantDb: TenantDb;
  terms: QuoteTerms;
};

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario.
 * Devuelve `null` cuando algo falla (el caller responde con mensaje genérico).
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
  return {
    tenantId: tenantRecord.id,
    tenantDb,
    terms: getQuoteTerms(tenantRecord.vertical),
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

/* ------------------------------------------------------------------ */
/* Banco de insumos — ítems                                            */
/* ------------------------------------------------------------------ */

export async function createApuItemAction(
  _prevState: ApuItemFormState,
  formData: FormData,
): Promise<ApuItemFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb } = context;

  const validation = validateApuItem(formData);
  if (!validation.ok) {
    return { status: "error", errors: validation.errors, values: validation.values };
  }

  try {
    await tenantDb.apu.createItem({
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

  revalidatePath(`/${tenantSlug}/quotes`);
  return { status: "ok" };
}

export async function updateApuItemAction(
  _prevState: ApuItemFormState,
  formData: FormData,
): Promise<ApuItemFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb } = context;

  if (!itemId) {
    return { status: "error", message: "Ítem no válido." };
  }

  const validation = validateApuItem(formData);
  if (!validation.ok) {
    return { status: "error", errors: validation.errors, values: validation.values };
  }

  try {
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

  revalidatePath(`/${tenantSlug}/quotes`);
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
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb } = context;

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

  revalidatePath(`/${tenantSlug}/quotes`);
  return { status: "ok" };
}

export async function updateApuActivityAction(
  _prevState: ApuActivityFormState,
  formData: FormData,
): Promise<ApuActivityFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb } = context;

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

  revalidatePath(`/${tenantSlug}/quotes`);
  return { status: "ok" };
}

/* ------------------------------------------------------------------ */
/* Presupuestos                                                        */
/* ------------------------------------------------------------------ */

export async function createQuoteAction(
  _prevState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb, terms } = context;

  const validation = validateQuote(formData);
  if (!validation.ok) {
    return { status: "error", errors: validation.errors, values: validation.values };
  }

  const quote = await tenantDb.quotes.create({
    customerId: validation.values.customerId || null,
    title: validation.values.title,
    items: validation.values.items,
    aiuConfig: {
      adminPercent: validation.values.adminPercent,
      imprevPercent: validation.values.imprevPercent,
      utilPercent: validation.values.utilPercent,
      taxPercent: validation.values.taxPercent,
    },
  });

  revalidatePath(`/${tenantSlug}/quotes`);
  revalidatePath(`/${tenantSlug}/quotes/new`);
  return {
    status: "ok",
    message: `${terms.quote} ${quote.code} creado como borrador.`,
  };
}

/** Detalle completo de un presupuesto para el modal (lectura). */
export async function getQuoteDetailAction(
  tenantSlug: string,
  quoteId: string,
) {
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return null;
  }
  const { tenantDb } = context;
  return tenantDb.quotes.get(quoteId);
}

/** Detalle de una actividad con composición (modal de catálogo). */
export async function getActivityDetailAction(
  tenantSlug: string,
  activityId: string,
) {
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return null;
  }
  const { tenantDb } = context;
  return tenantDb.apu.getActivity(activityId);
}

/* ------------------------------------------------------------------ */
/* Import CSV/Excel (atómico: upsert en transacción)                   */
/* ------------------------------------------------------------------ */

export async function importApuItemsAction(
  _prevState: ImportResultState,
  formData: FormData,
): Promise<ImportResultState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await requireTenantContext(tenantSlug);
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

    revalidatePath(`/${tenantSlug}/quotes`);
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