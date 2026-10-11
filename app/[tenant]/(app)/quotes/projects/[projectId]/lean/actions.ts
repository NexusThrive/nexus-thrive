"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import {
  validateCreateCommitment,
  validateCreateLookaheadTask,
  validateUpdateCommitmentStatus,
} from "./validators";

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

export async function getOrCreateProjectPlanAction(
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
    await context.tenantDb.lean.getOrCreatePlan(projectId);
    revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
    return { status: "ok" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al inicializar el plan operativo.";
    return { status: "error", message };
  }
}

export async function createLookaheadTaskAction(
  tenantSlug: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const validation = validateCreateLookaheadTask(raw);
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
    await context.tenantDb.lean.createLookaheadTask(projectId, {
      code: values.code,
      description: values.description,
      weekNumber: values.weekNumber,
      startDate: values.startDate,
      endDate: values.endDate,
      responsible: values.responsible,
      isRestricted: values.isRestricted ?? false,
      notes: values.notes ?? null,
    });
    revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
    return { status: "ok" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al crear la tarea del Lookahead.";
    return { status: "error", message, values: raw };
  }
}

export async function createWeeklyCommitmentAction(
  tenantSlug: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const validation = validateCreateCommitment(raw);
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
    await context.tenantDb.lean.createCommitment(projectId, {
      description: values.description,
      responsible: values.responsible,
      weekStartDate: values.weekStartDate,
    });
    revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
    return { status: "ok" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al crear el compromiso semanal.";
    return { status: "error", message, values: raw };
  }
}

export async function updateCommitmentStatusAction(
  tenantSlug: string,
  projectId: string,
  commitmentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const validation = validateUpdateCommitmentStatus(raw);
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
    await context.tenantDb.lean.updateCommitmentStatus(projectId, commitmentId, {
      status: values.status,
      failureCause: values.failureCause ?? null,
      failureNotes: values.failureNotes ?? null,
    });
    revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
    return { status: "ok" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error al actualizar el compromiso.";
    return { status: "error", message, values: raw };
  }
}
