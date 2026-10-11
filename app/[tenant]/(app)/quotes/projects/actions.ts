"use server";

import { revalidatePath } from "next/cache";
import { type ProjectDetail } from "@/lib/tenant-db";
import { requireTenantContext } from "@/lib/tenant-context";
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