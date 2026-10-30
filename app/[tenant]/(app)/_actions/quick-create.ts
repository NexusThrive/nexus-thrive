"use server";

import { listCashBoxes } from "@/lib/business/finance-db";
import { requireTenantContext } from "@/lib/tenant/context";

export type QuickCreateData = {
  customers: { id: string; name: string; email: string; phone: string | null }[];
  /** Hay un turno de caja abierto: el gasto sale de caja por defecto. */
  cashOpen: boolean;
  business: { name: string; subtitle?: string };
};

/**
 * Datos de los mini-modales de pago y gasto (se piden al abrir, no en cada
 * pantalla): clientes activos y si hay caja abierta. Verifica sesión, pertenencia
 * y que Finanzas esté activa (`requireTenantContext` con la ruta); filtra siempre
 * por `tenantId`. Mismo tope de clientes que la pantalla de Finanzas.
 */
export async function loadQuickCreateDataAction(tenantSlug: string): Promise<QuickCreateData | null> {
  const ctx = await requireTenantContext(tenantSlug, "/finance");
  if (!ctx) return null;
  try {
    const [customers, boxes] = await Promise.all([
      ctx.tenantDb.customers.search({ status: "active", pageSize: 200 }),
      listCashBoxes(ctx.tenantId),
    ]);
    return {
      customers: customers.rows.map((row) => ({ id: row.id, name: row.name, email: row.email ?? "", phone: row.phone ?? null })),
      cashOpen: boxes.some((box) => box.openSession),
      business: { name: ctx.tenant.name, subtitle: ctx.tenant.city ?? undefined },
    };
  } catch {
    return null;
  }
}
