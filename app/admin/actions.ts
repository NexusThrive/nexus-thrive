"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminDb } from "@/lib/admin-db";
import { validateSlug, type SlugValidation } from "@/lib/admin-catalogs";
import {
  validateTenantForm,
  validateToggleModule,
  validateToggleTenant,
  type TenantFieldErrors,
  type TenantFormValues,
} from "./validators";

export type AdminFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: TenantFieldErrors;
  values?: TenantFormValues;
};

export type SlugCheckState = {
  status: "available" | "taken" | "invalid" | "unauthorized";
};

const ACCESS_DENIED: AdminFormState = {
  status: "error",
  message: "No tienes permisos de administración.",
};

/**
 * Autorización de todas las actions /admin: sesión de Clerk + fila
 * `User.role = SUPERADMIN`. Devuelve `false` si falta cualquiera (el
 * caller responde con mensaje genérico, sin exponer detalle).
 */
async function requireSuperAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) {
    return false;
  }
  return createAdminDb().isSuperAdmin(userId);
}

function revalidateAdmin(): void {
  revalidatePath("/admin");
}

/**
 * Crea un tenant de la plataforma con sus módulos iniciales (una
 * transacción en la capa de datos). El slug vuelve a validarse y a
 * chequearse contra DB aquí — protección final contra el estado del form
 * y contra carreras con el check en vivo.
 */
export async function createTenantAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  if (!(await requireSuperAdmin())) {
    return ACCESS_DENIED;
  }

  const validation = validateTenantForm(formData);
  if (!validation.ok) {
    return {
      status: "error",
      errors: validation.errors,
      values: validation.values,
    };
  }

  const { name, slug, vertical, modules } = validation.values;
  const adminDb = createAdminDb();

  if (await adminDb.slugExists(slug)) {
    return {
      status: "error",
      errors: { slug: "Ese slug ya está en uso." },
      values: validation.values,
    };
  }

  try {
    await adminDb.createTenant({ name, slug, vertical, modules });
  } catch (error) {
    // Colisión de slug por carrera (constraint único en DB) u otro fallo
    // del motor: la transacción ya revirtió todo.
    const message =
      error instanceof Error &&
      (error.message.includes("unique") || error.message.includes("Tenant_slug"))
        ? "Ese slug ya está en uso."
        : "No se pudo crear el negocio. Intenta de nuevo.";
    console.error("[admin] createTenant failed:", error);
    return { status: "error", message, values: validation.values };
  }

  revalidateAdmin();
  return {
    status: "ok",
    message: `Negocio "${name}" creado correctamente.`,
  };
}

/**
 * Activa o suspende un negocio (fila + subdominio dejan de responder
 * cuando está suspendido; el host base pasa igual por el proxy).
 */
export async function toggleTenantStatusAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  if (!(await requireSuperAdmin())) {
    return ACCESS_DENIED;
  }

  const validation = validateToggleTenant(formData);
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const { tenantId, active } = validation.values;
  const updated = await createAdminDb().setTenantActive(tenantId, active);
  if (!updated) {
    return { status: "error", message: "El negocio no fue encontrado." };
  }

  revalidateAdmin();
  return {
    status: "ok",
    message: active ? "Negocio activado." : "Negocio suspendido.",
  };
}

/**
 * Activa o desactiva un módulo del tenant (upsert en `TenantModule`,
 * clave única `[tenantId, moduleName]`).
 */
export async function toggleTenantModuleAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  if (!(await requireSuperAdmin())) {
    return ACCESS_DENIED;
  }

  const validation = validateToggleModule(formData);
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const { tenantId, moduleName, active } = validation.values;
  const adminDb = createAdminDb();

  const tenant = await adminDb.getTenantModules(tenantId);
  if (!tenant) {
    return { status: "error", message: "El negocio no fue encontrado." };
  }

  await adminDb.toggleModule(tenantId, moduleName, active);

  revalidateAdmin();
  return {
    status: "ok",
    message: active ? "Módulo activado." : "Módulo desactivado.",
  };
}

/**
 * Check en vivo de disponibilidad de slug para el form (con debounce en
 * el cliente). Requiere SuperAdmin: evita que visitantes enumeren qué
 * slugs existen en la plataforma.
 */
export async function checkSlugAvailabilityAction(
  slug: string,
): Promise<SlugCheckState> {
  if (!(await requireSuperAdmin())) {
    return { status: "unauthorized" };
  }

  const validation: SlugValidation = validateSlug(String(slug ?? ""));
  if (!validation.ok) {
    return { status: "invalid" };
  }

  const exists = await createAdminDb().slugExists(validation.slug);
  return { status: exists ? "taken" : "available" };
}
