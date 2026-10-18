"use server";

import { requireTenantContext as requireSharedTenantContext } from "@/lib/tenant-context";
import { revalidatePath } from "next/cache";
import { createTenantDb } from "@/lib/tenant-db";
import { getVerticalTerms, type VerticalTerms } from "@/lib/vertical-terms";

/** Resultado de las acciones de fila / acciones masivas. */
export type CustomerActionResult = {
  ok: boolean;
  message?: string;
  deleted?: number;
};


type TenantDb = ReturnType<typeof createTenantDb>;

/** DB del tenant + vocabulario de su vertical (mensajes adaptativos). */
type TenantContext = {
  tenantDb: TenantDb;
  terms: VerticalTerms;
};

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario.
 * Devuelve `null` cuando algo falla (el caller responde con mensaje genérico).
 */
async function requireTenantContext(
  tenantSlug: string,
): Promise<TenantContext | null> {
  const context = await requireSharedTenantContext(tenantSlug);
  if (!context) {
    return null;
  }
  return { tenantDb: context.tenantDb, terms: getVerticalTerms(context.vertical) };
}

// ---------------------------------------------------------------------------
// Formulario (create / update) — firma compatible con useActionState
// ---------------------------------------------------------------------------



// ---------------------------------------------------------------------------
// Acciones de fila / masivas
// ---------------------------------------------------------------------------

export async function archiveCustomerAction(
  tenantSlug: string,
  customerId: string,
): Promise<CustomerActionResult> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  const { tenantDb, terms } = context;

  const result = await tenantDb.customers.archive(customerId);
  if (!result) {
    return {
      ok: false,
      message: `No se encontró el ${terms.customer.toLowerCase()}.`,
    };
  }

  revalidatePath(`/${tenantSlug}/crm`);
  return { ok: true };
}

export async function restoreCustomerAction(
  tenantSlug: string,
  customerId: string,
): Promise<CustomerActionResult> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  const { tenantDb, terms } = context;

  const result = await tenantDb.customers.restore(customerId);
  if (!result) {
    return {
      ok: false,
      message: `No se encontró el ${terms.customer.toLowerCase()}.`,
    };
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
  const context = await requireTenantContext(tenantSlug);
  if (!context) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  const { tenantDb, terms } = context;
  const customersLabel = terms.customers.toLowerCase();

  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return {
      ok: false,
      message: `Selecciona al menos un ${terms.customer.toLowerCase()} archivado.`,
    };
  }

  const deleted = await tenantDb.customers.deleteManyArchived(customerIds);
  if (deleted === 0) {
    return {
      ok: false,
      message: `No había ${customersLabel} archivados para eliminar (recarga la página).`,
    };
  }

  revalidatePath(`/${tenantSlug}/crm`);
  return { ok: true, deleted };
}
