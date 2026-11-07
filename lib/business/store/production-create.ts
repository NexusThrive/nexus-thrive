import type { DbTransaction } from "@/lib/foundation/db/db-transaction";

/** Crea la orden de cada línea que aún no la tiene. Idempotente por la clave única (tenantId, orderLineId). */
export async function createProductionOrders(tx: DbTransaction, tenantId: string, orderId: string): Promise<number> {
  const lines = await tx.orm.public.StoreOrderLine.where({ tenantId, orderId }).all();
  const existing = new Set((await tx.orm.public.ProductionOrder.where({ tenantId, orderId }).all()).map((p) => p.orderLineId));
  let made = 0;
  for (const l of lines) {
    if (existing.has(l.id)) continue;
    await tx.orm.public.ProductionOrder.create({ tenantId, orderId, orderLineId: l.id, productName: l.name, quantity: l.quantity });
    made++;
  }
  return made;
}
