"use server";

import { ensureProjectContainers } from "@/lib/construction/containers";
import { revalidatePath } from "next/cache";
import {
  canChangeProjectStatus,
  canEditProjectContent,
  isValidProjectStatus,
  projectStatusLabel,
  projectStatusNeedsBaselineWarning,
  type ProjectStatusValue,
} from "@/lib/construction/project-domain";
import { type ProjectDetail } from "@/lib/tenant/db";
import { requireTenantContext } from "@/lib/tenant/context";
import {
  projectHeaderToInput,
  validateCreateProject,
  validateProjectHeader,
  validateUpdateProject,
  type CreateProjectFieldErrors,
  type CreateProjectFormValues,
  type ProjectHeaderFieldErrors,
  type ProjectHeaderFormValues,
  type UpdateProjectFieldErrors,
  type UpdateProjectFormValues,
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

  // Presupuesto, plan y bitácora nacen con la obra: la página nunca los crea.
  await ensureProjectContainers(tenantDb, project.id);

  revalidatePath(`/${tenantSlug}/projects`);
  return {
    status: "ok",
    message: `Proyecto ${project.code} creado como borrador.`,
    projectId: project.id,
  };
}

/**
 * Prepara una obra creada antes de que los contenedores nacieran con ella
 * (presupuesto, plan y bitácora). Acción explícita: la página la ofrece cuando
 * falta alguno, en lugar de crearlos al renderizar.
 */
export async function prepareProjectAction(
  tenantSlug: string,
  projectId: string,
): Promise<void> {
  const context = await requireTenantContext(tenantSlug);
  if (!context || !projectId) {
    return;
  }
  const project = await context.tenantDb.projects.get(projectId);
  if (!project) {
    return;
  }
  await ensureProjectContainers(context.tenantDb, projectId);
  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
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

  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { status: "ok", message: "Ficha guardada." };
}

/* ------------------------------------------------------------------ */
/* Ciclo de vida del proyecto (Etapa 1, ajuste C)                      */
/* ------------------------------------------------------------------ */

export type UpdateProjectFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: UpdateProjectFieldErrors;
  values?: UpdateProjectFormValues;
};

export type ProjectStatusActionResult = {
  ok: boolean;
  /** Error legible si `ok` es `false`. */
  message?: string;
  /** Advertencia no bloqueante (p. ej. estado sin línea base aprobada). */
  warning?: string;
  /** Estado resultante cuando la transición se aplicó. */
  status?: ProjectStatusValue;
};

/** Traduce los errores tipados del dominio a mensajes legibles. */
function projectErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    switch (error.message) {
      case "NOT_FOUND":
        return "No se encontró el proyecto en este negocio.";
      case "STALE_STATUS":
        return "El estado del proyecto cambió desde que abriste esta página. Recargá e intentá de nuevo.";
      case "INVALID_TRANSITION":
        return "Esa transición de estado no está permitida.";
      case "MISSING_EXPECTED_STATUS":
        return "Falta el estado esperado para validar el cambio.";
      case "APPROVED_REQUIRES_QUOTE":
        return "Una obra queda contratada cuando el cliente aprueba una cotización. Emite la cotización y registra su aprobación en la pestaña Cotizaciones.";
      default:
        return error.message;
    }
  }
  return fallback;
}

/** Nombre y descripción del proyecto (última escritura gana). OWNER y STAFF. */
export async function updateProjectAction(
  _prevState: UpdateProjectFormState,
  formData: FormData,
): Promise<UpdateProjectFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_FORM;
  }
  if (!canEditProjectContent(context.role)) {
    return ACCESS_DENIED_FORM;
  }
  if (!projectId) {
    return { status: "error", message: "Proyecto no válido." };
  }

  const validation = validateUpdateProject(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  try {
    await context.tenantDb.projects.updateProject(projectId, {
      name: validation.values.name,
      description:
        validation.values.description === ""
          ? null
          : validation.values.description,
    });
  } catch (error) {
    return {
      status: "error",
      message: projectErrorMessage(error, "No se pudo actualizar el proyecto."),
      values: validation.values,
    };
  }

  revalidatePath(`/${tenantSlug}/projects`);
  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { status: "ok", message: "Proyecto actualizado." };
}

/**
 * Cambia el estado del proyecto (compare-and-set sobre `expectedStatus`).
 * Solo OWNER/SUPERADMIN. Si el estado destino es APPROVED o IN_EXECUTION y no
 * hay línea base aprobada, devuelve una advertencia — no bloquea.
 */
export async function updateProjectStatusAction(
  tenantSlug: string,
  projectId: string,
  expectedStatus: string,
  status: string,
): Promise<ProjectStatusActionResult> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  if (!canChangeProjectStatus(context.role)) {
    return {
      ok: false,
      message: "Solo el OWNER puede cambiar el estado del proyecto.",
    };
  }
  if (
    !projectId ||
    !isValidProjectStatus(expectedStatus) ||
    !isValidProjectStatus(status)
  ) {
    return { ok: false, message: "Transición de estado no válida." };
  }

  let applied: ProjectStatusValue;
  try {
    applied = await context.tenantDb.projects.updateProject(projectId, {
      expectedStatus,
      status,
    });
  } catch (error) {
    return {
      ok: false,
      message: projectErrorMessage(
        error,
        "No se pudo cambiar el estado del proyecto.",
      ),
    };
  }

  let warning: string | undefined;
  if (projectStatusNeedsBaselineWarning(applied)) {
    const baselines = await context.tenantDb.budgets.listBaselines(projectId);
    if (baselines.length === 0) {
      warning = `El proyecto pasó a “${projectStatusLabel(applied)}” sin una línea base de presupuesto aprobada.`;
    }
  }

  revalidatePath(`/${tenantSlug}/projects`);
  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { ok: true, status: applied, warning };
}