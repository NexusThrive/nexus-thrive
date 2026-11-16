"use server";

import { isVertical } from "@/lib/core/sectors/verticals";
import { checkModuleToggle } from "@/lib/core/entitlements/compat";
import { loadPricingConfig } from "@/lib/core/entitlements/settings";

import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { requireStaff } from "@/lib/platform/team/access";
import type { PermissionKey } from "@/lib/platform/team/permissions";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { deliverOwnerInvitation, retryOwnerInvitation } from "@/lib/platform/admin/owner-invitation-delivery";
import { createManagedBusiness, provisioningErrorMessage } from "@/lib/platform/admin/managed-business";
import { managedLifecycle, managedProvisioningStatus, type ManagedCommand } from "@/lib/platform/admin/managed-lifecycle";
import { managedBusinessInput } from "@/lib/platform/admin/managed-validation";
import { createAdminDb, type AuditLogInput } from "@/lib/platform/admin/db";
import { validateSlug, type SlugValidation } from "@/lib/core/tenancy/catalogs";
import {
  validateSuspendTenant,
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
 * equipo NEXUS con el permiso de la acción (lib/platform/team/access.ts). Devuelve el
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

  const parsed = managedBusinessInput.safeParse({ name: formData.get("name"), slug: formData.get("slug"), ownerEmail: formData.get("ownerEmail"), provisioningKey: formData.get("provisioningKey") });
  if (!parsed.success) {
    const errors: TenantFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      errors[key === "name" || key === "slug" || key === "ownerEmail" ? key : "form"] = issue.message;
    }
    return { status: "error", errors, message: errors.form };
  }
  if (["vertical", "tenantType", "modules", "active", "onboardingCompleted"].some((key) => formData.has(key))) {
    return { status: "error", message: "La configuración inicial la define NexusThrive. Actualiza el formulario." };
  }
  try {
    const tenant = await createManagedBusiness(parsed.data, actor);
    revalidateAdmin();
    revalidatePath("/admin/negocios");
    return { status: "ok", message: `Negocio «${tenant.name}» creado en preparación. El propietario todavía no tiene acceso.` };
  } catch (error) {
    return { status: "error", message: provisioningErrorMessage(error) };
  }
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

  try { await managedLifecycle(tenantId, "suspend", actor, reason); }
  catch (error) { return { status: "error", message: provisioningErrorMessage(error) }; }

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

  const managed = await managedProvisioningStatus(tenantId);
  if (managed && !managed.activated && !(await requireActor("accounts.create"))) return ACCESS_DENIED;
  try {
    await managedLifecycle(tenantId, "activate", actor);
    after(() => deliverOwnerInvitation(tenantId).then(() => undefined));
  }
  catch (error) { return { status: "error", message: provisioningErrorMessage(error) }; }

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
    const check = checkModuleToggle(await loadPricingConfig(), tenant.vertical, moduleName, active, null, { allowIncompatible: true });
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

/** Every lifecycle command rechecks staff permissions on the server. */
export async function manageProvisioningAction(tenantId: string, command: Exclude<ManagedCommand, "suspend">): Promise<AdminFormState> {
  if (!["ready", "activate", "renew", "revoke"].includes(command)) return { status: "error", message: "Acción no válida." };
  const actor = await requireActor(command === "ready" ? "accounts.edit" : command === "activate" ? "accounts.suspend" : "accounts.create");
  if (!actor) return ACCESS_DENIED;
  const id = validateTenantId(tenantId);
  if (!id) return { status: "error", message: "Negocio no válido." };
  if (command === "activate") {
    const managed = await managedProvisioningStatus(id);
    if (managed && !managed.activated && !(await requireActor("accounts.create"))) return ACCESS_DENIED;
  }
  try {
    await managedLifecycle(id, command, actor);
    if (command === "activate" || command === "renew") after(() => deliverOwnerInvitation(id).then(() => undefined));
    revalidateAdmin();
    revalidatePath(`/admin/negocios/${id}`);
    return { status: "ok", message: command === "ready" ? "Negocio listo para activar." : command === "activate" ? "Negocio habilitado. La invitación queda pendiente de entrega si corresponde." : command === "renew" ? "Invitación renovada y pendiente de entrega." : "Invitación pendiente revocada." };
  } catch (error) { return { status: "error", message: provisioningErrorMessage(error) }; }
}

export async function retryOwnerDeliveryAction(tenantId: string): Promise<AdminFormState> {
  const actor = await requireActor("accounts.create");
  if (!actor) return ACCESS_DENIED;
  const id = validateTenantId(tenantId);
  if (!id) return { status: "error", message: "Negocio no válido." };
  try {
    await retryOwnerInvitation(id, actor);
    after(() => deliverOwnerInvitation(id).then(() => undefined));
    revalidatePath(`/admin/negocios/${id}`);
    return { status: "ok", message: "Entrega programada de nuevo. Actualiza el estado en un momento." };
  } catch (error) { return { status: "error", message: provisioningErrorMessage(error) }; }
}
