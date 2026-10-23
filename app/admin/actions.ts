"use server";

import { isVertical } from "@/lib/admin/catalogs";
import { checkModuleToggle } from "@/lib/plans/compat";
import { loadPricingConfig } from "@/lib/plans/settings";

import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { requireStaff } from "@/lib/ops/access";
import type { PermissionKey } from "@/lib/ops/permissions";
import { revalidatePath } from "next/cache";
import { createAdminDb, type AuditLogInput } from "@/lib/admin/db";
import { validateSlug, type SlugValidation } from "@/lib/admin/catalogs";
import {
  validateSuspendTenant,
  validateTenantForm,
  validateTenantId,
  validateToggleModule,
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

export type ImpersonationState = {
  status: "ok" | "error";
  message?: string;
  /** Ticket de Clerk para iniciar sesión como el dueño del negocio. */
  ticket?: string;
  /** Destino sugerido tras completar el cambio de sesión. */
  url?: string;
};

const ACCESS_DENIED: AdminFormState = {
  status: "error",
  message: "No tienes permisos de administración.",
};

type Actor = { userId: string; email: string | null };

/**
 * Autorización de las actions del Operations Center: integrante activo del
 * equipo NEXUS con el permiso de la acción (lib/ops/access.ts). Devuelve el
 * actor (para auditoría) o `null`.
 */
async function requireActor(permission: PermissionKey): Promise<Actor | null> {
  const ctx = await requireStaff(permission);
  return ctx ? { userId: ctx.clerkUserId, email: ctx.email } : null;
}

function revalidateAdmin(): void {
  revalidatePath("/admin");
}

/** IP y user-agent de la request, solo para la bitácora de auditoría. */
async function requestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ipAddress:
      forwarded?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      null,
    userAgent: headerList.get("user-agent") ?? null,
  };
}

/**
 * Registra una acción en la bitácora de auditoría. Nunca rompe la acción
 * principal: si la auditoría falla, se registra en consola y se continúa.
 */
async function audit(
  actor: Actor,
  entry: Omit<AuditLogInput, "actorId" | "actorEmail">,
): Promise<void> {
  try {
    const context = await requestContext();
    await createAdminDb().logAudit({
      actorId: actor.userId,
      actorEmail: actor.email,
      ...entry,
      ...context,
    });
  } catch (error) {
    console.error("[admin] audit failed:", error);
  }
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
  const actor = await requireActor("accounts.create");
  if (!actor) {
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

  const { name, slug, vertical, modules, tenantType, legalName, taxId, teamSize, address, ownerEmail } =
    validation.values;
  const adminDb = createAdminDb();

  if (await adminDb.slugExists(slug)) {
    return {
      status: "error",
      errors: { slug: "Ese slug ya está en uso." },
      values: validation.values,
    };
  }

  try {
    await adminDb.createTenant({
      name,
      slug,
      vertical,
      modules,
      tenantType,
      legalName,
      taxId,
      teamSize,
      address,
      ownerEmail,
    });
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

  await audit(actor, {
    action: "CREATE_TENANT",
    targetTenantName: name,
    metadata: { slug, vertical, modules, tenantType, taxId, teamSize, ownerEmail },
  });

  revalidateAdmin();
  return {
    status: "ok",
    message: `Negocio "${name}" creado correctamente.`,
  };
}

/**
 * Suspende un negocio con motivo obligatorio (queda en el historial y en la
 * bitácora). El subdominio deja de responder vía proxy.
 */
export async function suspendTenantAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireActor("accounts.suspend");
  if (!actor) {
    return ACCESS_DENIED;
  }

  const validation = validateSuspendTenant(formData);
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const { tenantId, reason } = validation.values;
  const adminDb = createAdminDb();

  const tenant = await adminDb.getTenantModules(tenantId);
  if (!tenant) {
    return { status: "error", message: "El negocio no fue encontrado." };
  }
  if (!tenant.active) {
    return { status: "ok", message: "El negocio ya estaba suspendido." };
  }

  await adminDb.suspendTenant(tenantId, reason);
  await audit(actor, {
    action: "SUSPEND_TENANT",
    targetTenantId: tenant.tenantId,
    targetTenantName: tenant.name,
    metadata: { reason },
  });

  revalidateAdmin();
  revalidatePath(`/admin/${tenantId}`);
  return { status: "ok", message: `Negocio "${tenant.name}" suspendido.` };
}

/** Reactiva un negocio suspendido (conserva el motivo histórico). */
export async function activateTenantAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireActor("accounts.suspend");
  if (!actor) {
    return ACCESS_DENIED;
  }

  const tenantId = validateTenantId(formData.get("tenantId"));
  if (!tenantId) {
    return { status: "error", message: "Negocio no válido." };
  }

  const adminDb = createAdminDb();
  const tenant = await adminDb.getTenantModules(tenantId);
  if (!tenant) {
    return { status: "error", message: "El negocio no fue encontrado." };
  }

  await adminDb.activateTenant(tenantId);
  await audit(actor, {
    action: "ACTIVATE_TENANT",
    targetTenantId: tenant.tenantId,
    targetTenantName: tenant.name,
  });

  revalidateAdmin();
  revalidatePath(`/admin/${tenantId}`);
  return { status: "ok", message: `Negocio "${tenant.name}" reactivado.` };
}

/**
 * Activa o desactiva un módulo del tenant (upsert en `TenantModule`,
 * clave única `[tenantId, moduleName]`).
 */
export async function toggleTenantModuleAction(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireActor("accounts.modules");
  if (!actor) {
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

  // Compatibilidad con el rubro y estado del catálogo (Planes y módulos).
  if (isVertical(tenant.vertical)) {
    const check = checkModuleToggle(await loadPricingConfig(), tenant.vertical, moduleName, active);
    if (!check.ok) return { status: "error", message: check.message };
  }

  await adminDb.toggleModule(tenantId, moduleName, active);
  await audit(actor, {
    action: "TOGGLE_MODULE",
    targetTenantId: tenant.tenantId,
    targetTenantName: tenant.name,
    metadata: { moduleName, active },
  });

  revalidateAdmin();
  revalidatePath(`/admin/${tenantId}`);
  return {
    status: "ok",
    message: active ? "Módulo activado." : "Módulo desactivado.",
  };
}

/** Detalle de un negocio para el drawer (autorizado server-side). */
export async function getTenantDetailAction(tenantId: string) {
  const actor = await requireActor("accounts.view");
  if (!actor) {
    return null;
  }
  const id = validateTenantId(tenantId);
  if (!id) {
    return null;
  }
  return createAdminDb().getTenantDetail(id);
}

/**
 * Crea un token de actor de Clerk para que el CEO entre al negocio como su
 * dueño. Devuelve un ticket de un solo uso (el cliente completa el cambio de
 * sesión). Queda auditado.
 */
export async function createImpersonationAction(
  tenantId: string,
): Promise<ImpersonationState> {
  const actor = await requireActor("accounts.impersonate");
  if (!actor) {
    return { status: "error", message: "No tienes permisos de administración." };
  }

  const id = validateTenantId(tenantId);
  if (!id) {
    return { status: "error", message: "Negocio no válido." };
  }

  const adminDb = createAdminDb();
  const detail = await adminDb.getTenantDetail(id);
  if (!detail) {
    return { status: "error", message: "El negocio no fue encontrado." };
  }

  const owner = detail.users.find((user) => user.role === "OWNER");
  const targetClerkUserId =
    owner?.id ?? detail.users[0]?.id ?? null;
  if (!targetClerkUserId) {
    return {
      status: "error",
      message: "El negocio no tiene usuarios con acceso configurado.",
    };
  }

  // `User.id` no es el id de Clerk; se resuelve el clerkUserId real.
  const clerkUserId = await adminDb.getUserClerkId(targetClerkUserId);
  if (!clerkUserId) {
    return {
      status: "error",
      message: "No se pudo resolver el acceso del negocio.",
    };
  }

  try {
    const client = await clerkClient();
    const actorToken = await client.actorTokens.create({
      userId: clerkUserId,
      actor: { sub: actor.userId },
      expiresInSeconds: 600,
      sessionMaxDurationInSeconds: 3600,
    });

    await audit(actor, {
      action: "IMPERSONATE",
      targetTenantId: detail.id,
      targetTenantName: detail.name,
      metadata: { targetClerkUserId: clerkUserId },
    });

    return {
      status: "ok",
      ticket: actorToken.token ?? undefined,
      url: detail.slug ? `/${detail.slug}` : undefined,
    };
  } catch (error) {
    console.error("[admin] impersonation failed:", error);
    return {
      status: "error",
      message: "No se pudo iniciar la impersonación. Intenta de nuevo.",
    };
  }
}

/**
 * Check en vivo de disponibilidad de slug para el form (con debounce en
 * el cliente). Requiere SuperAdmin: evita que visitantes enumeren qué
 * slugs existen en la plataforma.
 */
export async function checkSlugAvailabilityAction(
  slug: string,
): Promise<SlugCheckState> {
  if (!(await requireActor("accounts.create"))) {
    return { status: "unauthorized" };
  }

  const validation: SlugValidation = validateSlug(String(slug ?? ""));
  if (!validation.ok) {
    return { status: "invalid" };
  }

  const exists = await createAdminDb().slugExists(validation.slug);
  return { status: exists ? "taken" : "available" };
}
