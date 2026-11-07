"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/core/auth/permissions";
import { customerHasHistory, duplicateCustomer } from "@/lib/business/customers/new-customer-db";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { createTenantDb } from "@/lib/core/tenancy/db";

export type FichaActionResult = { ok: true; message: string; id?: string } | { ok: false; message: string; suggestArchive?: boolean };

/** Duplica el cliente (sin documento) y devuelve el nuevo para abrir su edición. */
export async function duplicateCustomerAction(slug: string, customerId: string): Promise<FichaActionResult> {
  const ctx = await requireTenantContext(slug, "/contactos");
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  const r = await duplicateCustomer(ctx.tenantId, customerId, ctx.memberId);
  if (!r.ok) return { ok: false, message: r.message };
  revalidatePath(`/${slug}/contactos`);
  return { ok: true, message: "Cliente duplicado", id: r.id };
}

/**
 * Elimina un cliente desde su ficha. Si tiene ventas, citas o facturas no se borra: se ofrece archivarlo. Sin historial, se archiva y
 * se elimina con las mismas operaciones de la lista (que solo borran archivados).
 */
export async function deleteCustomerFromFichaAction(slug: string, customerId: string): Promise<FichaActionResult> {
  const ctx = await requireTenantContext(slug, "/contactos");
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  if (!can(ctx.role, "customers.delete")) return { ok: false, message: "Tu rol no puede eliminar clientes." };
  if (await customerHasHistory(ctx.tenantId, customerId)) {
    return { ok: false, suggestArchive: true, message: "Este cliente tiene ventas, citas o facturas. Archívalo para conservar su historial." };
  }
  const tenantDb = createTenantDb(ctx.tenantId);
  await tenantDb.customers.archive(customerId);
  const deleted = await tenantDb.customers.deleteManyArchived([customerId]);
  if (deleted === 0) return { ok: false, message: "No se pudo eliminar el cliente." };
  await logTenantAction(ctx, "BIZ_CUSTOMERS_DELETE", { customerIds: [customerId], deleted });
  revalidatePath(`/${slug}/contactos`);
  return { ok: true, message: "Cliente eliminado" };
}
