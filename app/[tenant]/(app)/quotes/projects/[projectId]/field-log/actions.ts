"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { validateCreateFieldLogEntry } from "./validators";

export type ActionState = {
  status: "idle" | "ok" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
  values?: Record<string, unknown>;
};

type TenantContext = {
  tenantId: string;
  tenantDb: ReturnType<typeof createTenantDb>;
};

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
  const member = await db.orm.public.User.where({
    clerkUserId: userId,
    tenantId: tenantRecord.id,
  }).first();
  if (!member) {
    return null;
  }
  return {
    tenantId: tenantRecord.id,
    tenantDb: createTenantDb(tenantRecord.id),
  };
}

export async function getOrCreateFieldLogAction(
  tenantSlug: string,
  projectId: string,
  _prev: ActionState,
  _form: FormData,
): Promise<ActionState> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { status: "error", message: "Debes iniciar sesión para continuar." };
    }
    const context = await requireTenantContext(tenantSlug);
    if (!context) {
      return { status: "error", message: "No tienes acceso a este negocio." };
    }
    await context.tenantDb.fieldLog.getOrCreateLog(projectId);
    revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
    return { status: "ok" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al inicializar la bitácora.";
    return { status: "error", message };
  }
}

export async function createFieldLogEntryAction(
  tenantSlug: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const validation = validateCreateFieldLogEntry(raw);
  if (!validation.ok) {
    return {
      status: "error",
      message: "Revisa los campos del formulario.",
      errors: validation.errors,
      values: raw,
    };
  }
  const values = validation.values;

  try {
    const { userId } = await auth();
    if (!userId) {
      return { status: "error", message: "Debes iniciar sesión para continuar." };
    }
    const context = await requireTenantContext(tenantSlug);
    if (!context) {
      return { status: "error", message: "No tienes acceso a este negocio." };
    }
    // Obtener la bitácora del proyecto
    const log = await context.tenantDb.fieldLog.getOrCreateLog(projectId);
    await context.tenantDb.fieldLog.createEntry(log.id, {
      type: values.type,
      entryDate: values.entryDate,
      title: values.title,
      description: values.description,
      weather: values.weather,
      laborCount: values.laborCount,
      authorName: values.authorName,
      authorRole: values.authorRole,
      photoUrls: values.photoUrls,
    });
    revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
    return { status: "ok" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al crear la anotación.";
    return { status: "error", message, values: raw };
  }
}

export async function deleteFieldLogEntryAction(
  tenantSlug: string,
  projectId: string,
  entryId: string,
  _prev: ActionState,
  _form: FormData,
): Promise<ActionState> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { status: "error", message: "Debes iniciar sesión para continuar." };
    }
    const context = await requireTenantContext(tenantSlug);
    if (!context) {
      return { status: "error", message: "No tienes acceso a este negocio." };
    }
    // Obtener la bitácora para validar pertenencia
    const log = await context.tenantDb.fieldLog.getLog(projectId);
    if (!log) {
      return { status: "error", message: "Bitácora no encontrada." };
    }
    await context.tenantDb.fieldLog.deleteEntry(log.id, entryId);
    revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
    return { status: "ok" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al eliminar la anotación.";
    return { status: "error", message };
  }
}