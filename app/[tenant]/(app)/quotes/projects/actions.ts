"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { createTenantDb, type ProjectDetail } from "@/lib/tenant-db";
import {
  projectHeaderToInput,
  validateCreateProject,
  validateProjectHeader,
  type CreateProjectFieldErrors,
  type CreateProjectFormValues,
  type ProjectHeaderFieldErrors,
  type ProjectHeaderFormValues,
} from "./validators";

/* ------------------------------------------------------------------ */
/* Tipos de estado (firma useActionState)                              */
/* ------------------------------------------------------------------ */

export type CreateProjectFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: CreateProjectFieldErrors;
  values?: CreateProjectFormValues;
  /** Id del proyecto creado (para navegar al detalle). */
  projectId?: string;
};

export type ProjectHeaderFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: ProjectHeaderFieldErrors;
  values?: ProjectHeaderFormValues;
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
  };
}

/** Detecta violación de clave única (código duplicado en el tenant). */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    /duplicate key value violates unique constraint/i.test(error.message)
  );
}

/* ------------------------------------------------------------------ */
/* Proyectos                                                           */
/* ------------------------------------------------------------------ */

export async function createProjectAction(
  _prevState: CreateProjectFormState,
  formData: FormData,
): Promise<CreateProjectFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb } = context;

  const validation = validateCreateProject(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  let project: ProjectDetail;
  try {
    project = await tenantDb.projects.create({
      customerId: validation.values.customerId,
      name: validation.values.name,
      description: validation.values.description || undefined,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cliente no encontrado")
    ) {
      return {
        status: "error",
        message: error.message,
        values: validation.values,
      };
    }
    if (isUniqueViolation(error)) {
      return {
        status: "error",
        message: "Ya existe un proyecto con ese código en este negocio.",
        values: validation.values,
      };
    }
    throw error;
  }

  revalidatePath(`/${tenantSlug}/quotes/projects`);
  return {
    status: "ok",
    message: `Proyecto ${project.code} creado como borrador.`,
    projectId: project.id,
  };
}

export async function updateProjectHeaderAction(
  _prevState: ProjectHeaderFormState,
  formData: FormData,
): Promise<ProjectHeaderFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  const { tenantDb } = context;

  if (!projectId) {
    return { status: "error", message: "Proyecto no válido." };
  }

  const validation = validateProjectHeader(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  const updated = await tenantDb.projectHeaders.update(
    projectId,
    projectHeaderToInput(validation.values),
  );
  if (!updated) {
    return {
      status: "error",
      message: "No se encontró el proyecto en este negocio.",
    };
  }

  revalidatePath(`/${tenantSlug}/quotes/projects/${projectId}`);
  return { status: "ok", message: "Ficha guardada." };
}