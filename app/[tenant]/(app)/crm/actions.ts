"use server";

import { requireTenantContext } from "@/lib/tenant/context";
import { revalidatePath } from "next/cache";
import { createTenantDb } from "@/lib/tenant/db";
import { getVerticalTerms, type VerticalTerms } from "@/lib/vertical-terms";
import { can } from "@/lib/business/permissions";
import { logTenantAction } from "@/lib/tenant/audit";
import { withinLimit } from "@/lib/benefits/benefits";
import { customerLimit } from "@/lib/business/customers-db";

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
  role: string;
  /** Contexto completo, para la bitácora del negocio. */
  shared: NonNullable<Awaited<ReturnType<typeof requireTenantContext>>>;
};

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario.
 * Devuelve `null` cuando algo falla (el caller responde con mensaje genérico).
 */
async function actionContext(
  tenantSlug: string,
): Promise<TenantContext | null> {
  const context = await requireTenantContext(tenantSlug, "/crm");
  if (!context) {
    return null;
  }
  return { tenantDb: context.tenantDb, terms: getVerticalTerms(context.vertical), role: context.role, shared: context };
}

/** Archivar, restaurar y borrar clientes es de administración (SEC-05). */
function cannotRemoveCustomers(context: TenantContext): CustomerActionResult | null {
  if (can(context.role, "customers.delete")) return null;
  return {
    ok: false,
    message: `Tu rol no puede archivar ni eliminar ${context.terms.customers.toLowerCase()}. Pídeselo a administración.`,
  };
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
  const context = await actionContext(tenantSlug);
  if (!context) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  const denied = cannotRemoveCustomers(context);
  if (denied) return denied;
  const { tenantDb, terms } = context;

  const result = await tenantDb.customers.archive(customerId);
  if (!result) {
    return {
      ok: false,
      message: `No se encontró el ${terms.customer.toLowerCase()}.`,
    };
  }
  await logTenantAction(context.shared, "BIZ_CUSTOMER_ARCHIVE", { customerId });

  revalidatePath(`/${tenantSlug}/crm`);
  return { ok: true };
}

export async function restoreCustomerAction(
  tenantSlug: string,
  customerId: string,
): Promise<CustomerActionResult> {
  const context = await actionContext(tenantSlug);
  if (!context) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  const denied = cannotRemoveCustomers(context);
  if (denied) return denied;
  const { tenantDb, terms } = context;

  // Restaurar suma un cliente activo: respeta el límite acordado (código a medida).
  const { limit, used } = await customerLimit(context.shared.tenantId);
  if (!withinLimit(limit, used)) {
    return { ok: false, message: `Tu acuerdo incluye ${limit} ${terms.customers.toLowerCase()} activos. Archiva alguno o escríbenos para ampliarlo.` };
  }
  const result = await tenantDb.customers.restore(customerId);
  if (!result) {
    return {
      ok: false,
      message: `No se encontró el ${terms.customer.toLowerCase()}.`,
    };
  }
  await logTenantAction(context.shared, "BIZ_CUSTOMER_RESTORE", { customerId });

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
  const context = await actionContext(tenantSlug);
  if (!context) {
    return { ok: false, message: "No tienes acceso a este negocio." };
  }
  const denied = cannotRemoveCustomers(context);
  if (denied) return denied;
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

  await logTenantAction(context.shared, "BIZ_CUSTOMERS_DELETE", { customerIds, deleted });
  revalidatePath(`/${tenantSlug}/crm`);
  return { ok: true, deleted };
}
