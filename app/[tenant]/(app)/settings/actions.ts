"use server";

import { requireTenantContext as requireSharedTenantContext } from "@/lib/tenant/context";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";
import { isModule, isVertical, validateSlug } from "@/lib/admin/catalogs";
import { checkModuleToggle } from "@/lib/plans/compat";
import { loadPricingConfig } from "@/lib/plans/settings";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";

type TenantDb = ReturnType<typeof createTenantDb>;

type RoleValue = "SUPERADMIN" | "OWNER" | "STAFF";

export type ProfileFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: {
    name?: string;
    slug?: string;
    city?: string;
    address?: string;
    taxId?: string;
    phone?: string;
  };
};

export type ModulesFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: {
    moduleName?: string;
  };
};

const ACCESS_DENIED_PROFILE: ProfileFormState = {
  status: "error",
  message: "No tienes acceso a este negocio.",
};

const ACCESS_DENIED_MODULES: ModulesFormState = {
  status: "error",
  message: "No tienes acceso a este negocio.",
};

const FORBIDDEN_PROFILE: ProfileFormState = {
  status: "error",
  message: "Solo el administrador del negocio puede editar el perfil.",
};

const FORBIDDEN_MODULES: ModulesFormState = {
  status: "error",
  message: "Solo el administrador del negocio puede gestionar los módulos.",
};

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario y devuelve
 * el contexto de datos acotado al tenant. `null` cuando falla el acceso.
 *
 * El tenant SIEMPRE se resuelve en el servidor a partir del slug de la ruta:
 * nunca se confía en un `tenantId` enviado por el cliente.
 */
async function requireTenantContext(
  tenantSlug: string,
): Promise<{ tenantDb: TenantDb; tenantId: string; role: RoleValue } | null> {
  const context = await requireSharedTenantContext(tenantSlug);
  if (!context) {
    return null;
  }
  return {
    tenantDb: context.tenantDb,
    tenantId: context.tenantId,
    role: context.role as RoleValue,
  };
}

/**
 * Actualiza el perfil del negocio (name, slug, city, address, taxId,
 * whatsappNumber). Valida los campos, el formato/uniquidad del slug y exige
 * rol de administrador (OWNER/SUPERADMIN).
 */
export async function updateTenantProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_PROFILE;
  }

  if (context.role !== "OWNER" && context.role !== "SUPERADMIN") {
    return FORBIDDEN_PROFILE;
  }

  const { tenantId } = context;

  // Recopilar datos del formulario (el slug se normaliza más abajo).
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || undefined;
  const address = String(formData.get("address") ?? "").trim() || undefined;
  const taxId = String(formData.get("taxId") ?? "").trim() || undefined;
  const whatsappNumber = String(formData.get("phone") ?? "").trim() || undefined;

  const errors: ProfileFormState["errors"] = {};

  if (!name) {
    errors.name = "El nombre es requerido.";
  }

  // Reutiliza el validador central (formato, longitud, reservados).
  const slugValidation = validateSlug(rawSlug);
  let slug: string | undefined;
  if (!slugValidation.ok) {
    errors.slug = slugValidation.error;
  } else {
    slug = slugValidation.slug;
    // Unicidad: el slug es @unique en el esquema; se comprueba antes de escribir.
    const existing = await db.orm.public.Tenant.where({ slug }).first();
    if (existing && existing.id !== tenantId) {
      errors.slug = "Ese slug ya está en uso por otro negocio.";
    }
  }

  if (errors.name || errors.slug) {
    return { status: "error", errors };
  }

  try {
    await db.orm.public.Tenant.where({ id: tenantId }).update({
      name,
      slug,
      city,
      address,
      taxId,
      whatsappNumber,
    });

    // La ruta de settings y el layout del tenant (para el nombre en la
    // cabecera). Si el slug cambió, se revalidan también la ruta nueva.
    revalidatePath(`/${tenantSlug}/settings`);
    revalidatePath(`/${tenantSlug}`, "layout");
    if (slug && slug !== tenantSlug) {
      revalidatePath(`/${slug}/settings`);
      revalidatePath(`/${slug}`, "layout");
    }

    return { status: "ok", message: "Perfil actualizado correctamente." };
  } catch (error) {
    console.error("Error updating tenant profile:", error);
    return {
      status: "error",
      message: "Error al actualizar el perfil. Inténtalo de nuevo.",
    };
  }
}

/**
 * Activa o desactiva un módulo del tenant de forma idempotente (upsert sobre
 * la clave única `[tenantId, moduleName]`). Exige rol de administrador.
 */
export async function toggleModuleAction(
  _prevState: ModulesFormState,
  formData: FormData,
): Promise<ModulesFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const moduleName = String(formData.get("moduleName") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return ACCESS_DENIED_MODULES;
  }

  if (context.role !== "OWNER" && context.role !== "SUPERADMIN") {
    return FORBIDDEN_MODULES;
  }

  if (!isModule(moduleName)) {
    return {
      status: "error",
      errors: { moduleName: "Módulo no válido." },
    };
  }

  const { tenantId } = context;

  // Solo módulos compatibles con el rubro y operativos; el Inicio no se apaga.
  const tenant = await db.orm.public.Tenant.select("vertical").where({ id: tenantId }).first();
  if (tenant && isVertical(tenant.vertical)) {
    const check = checkModuleToggle(await loadPricingConfig(), tenant.vertical, moduleName, active);
    if (!check.ok) return { status: "error", errors: { moduleName: check.message } };
  }

  try {
    // Idempotente en ambas direcciones: crear si no existía, actualizar si sí.
    await db.orm.public.TenantModule.upsert({
      create: { tenantId, moduleName, active },
      update: { active },
      conflictOn: { tenantId, moduleName },
    });

    // El layout del tenant renderiza la sidebar a partir de TenantModule:
    // revalidar el segmento de layout mantiene la navegación sincronizada.
    revalidatePath(`/${tenantSlug}`, "layout");
    revalidatePath(`/${tenantSlug}/settings`);

    return {
      status: "ok",
      message: active
        ? `Módulo ${module} activado correctamente.`
        : `Módulo ${module} desactivado correctamente.`,
    };
  } catch (error) {
    console.error("Error toggling module:", error);
    return {
      status: "error",
      message: "Error al actualizar el módulo. Inténtalo de nuevo.",
    };
  }
}

/**
 * Elimina el negocio de raíz desde el panel del propio negocio: el negocio y
 * TODOS sus datos (clientes, membresías, dinero, asistencia, proyectos…). Las
 * cuentas de Clerk del equipo quedan libres: pueden entrar de nuevo y crear
 * otro negocio.
 *
 * Solo el dueño (o el equipo de NEXUS) puede hacerlo, y pide confirmar
 * escribiendo "eliminar" (lo comprueba el servidor).
 */
export async function deleteOwnBusinessAction(
  tenantSlug: string,
  confirm: string,
): Promise<{ status: "ok"; total: number } | { status: "error"; message: string }> {
  if (confirm.trim().toLowerCase() !== "eliminar") {
    return { status: "error", message: "Para confirmar, escribe «eliminar»." };
  }

  const context = await requireSharedTenantContext(tenantSlug);
  if (!context) {
    return { status: "error", message: "Tu sesión expiró. Vuelve a entrar." };
  }
  if (context.role !== "OWNER" && context.role !== "SUPERADMIN") {
    return { status: "error", message: "Solo el dueño del negocio puede eliminarlo." };
  }

  const result = await deleteTenantCompletely(context.tenantId);
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "ok", total: result.total };
}
