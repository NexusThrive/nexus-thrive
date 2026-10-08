"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { validateCustomer, type CustomerFieldErrors } from "./validators";

export type CustomerFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: CustomerFieldErrors;
  values?: { name: string; email: string; phone: string };
};

/** Resultado de las acciones de fila / acciones masivas. */
export type CustomerActionResult = {
  ok: boolean;
  message?: string;
  deleted?: number;
};

const ACCESS_DENIED_FORM: CustomerFormState = {
  status: "error",
  message: "No tienes acceso a este negocio.",
};

type TenantDb = ReturnType<typeof createTenantDb>;

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario.
 * Devuelve `null` cuando algo falla (el caller responde con mensaje genérico).
 */
async function requireTenantDb(tenantSlug: string): Promise<TenantDb | null> {
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

  return tenantDb;
}

// ---------------------------------------------------------------------------
// Formulario (create / update) — firma compatible con useActionState
// ---------------------------------------------------------------------------

export async function createCustomerAction(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const tenantDb = await requireTenantDb(tenantSlug);
  if (!tenantDb) {
    return ACCESS_DENIED_FORM;
  }

  const validation = validateCustomer(formData);
  if (!validation.ok) {
    return { status: "error", errors: validation.errors, values: validation.values };
  }

  await tenantDb.customers.create({
    name: validation.values.name,
    email: validation.values.email || null,
    phone: validation.values.phone || null,
    active: true,
  });

  revalidatePath(`/${tenantSlug}/crm`);
  return { status: "ok" };
}

export async function updateCustomerAction(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) {
    return { status: "error", message: "Cliente no válido." };
  }

  const tenantDb = await requireTenantDb(tenantSlug);
  if (!tenantDb) {
    return ACCESS_DENIED_FORM;
  }

  const validation = validateCustomer(formData);
  if (!validation.ok) {
    return { status: "error", errors: validation.errors, values: validation.values };
  }

  const updated = await tenantDb.customers.update(customerId, {
    name: validation.values.name,
    email: validation.values.email || null,
    phone: validation.values.phone || null,
  });

  if (!updated) {
    return { status: "error", message: "No se encontró el cliente a editar." };
  }

  revalidatePath(`/${tenantSlug}/crm`);
  return { status: "ok" };
}

// ---------------------------------------------------------------------------
// Acciones de fila / masivas
// ---------------------------------------------------------------------------

export async function archiveCustomerAction(
  tenantSlug: string,
  customerId: string,
): Promise<CustomerActionResult> {
  const tenantDb = await requireTenantDb(tenantSlug);
  if (!tenantDb) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }

  const result = await tenantDb.customers.archive(customerId);
  if (!result) {
    return { ok: false, message: "No se encontró el cliente." };
  }

  revalidatePath(`/${tenantSlug}/crm`);
  return { ok: true };
}

export async function restoreCustomerAction(
  tenantSlug: string,
  customerId: string,
): Promise<CustomerActionResult> {
  const tenantDb = await requireTenantDb(tenantSlug);
  if (!tenantDb) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }

  const result = await tenantDb.customers.restore(customerId);
  if (!result) {
    return { ok: false, message: "No se encontró el cliente." };
  }

  revalidatePath(`/${tenantSlug}/crm`);
  return { ok: true };
}

/**
 * Borrado definitivo — solo clientes ya archivados (la condición se aplica
 * en la base de datos). Los pagos se conservan (FK `SetNull`).
 */
export async function deleteCustomersAction(
  tenantSlug: string,
  customerIds: string[],
): Promise<CustomerActionResult> {
  const tenantDb = await requireTenantDb(tenantSlug);
  if (!tenantDb) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }

  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return { ok: false, message: "Selecciona al menos un cliente archivado." };
  }

  const deleted = await tenantDb.customers.deleteManyArchived(customerIds);
  if (deleted === 0) {
    return {
      ok: false,
      message: "No había clientes archivados para eliminar (recarga la página).",
    };
  }

  revalidatePath(`/${tenantSlug}/crm`);
  return { ok: true, deleted };
}
