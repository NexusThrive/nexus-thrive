import { db } from "@/prisma/db";

/**
 * Existencias apartadas: lo que piden los pedidos que aún no se pagan (su stock sale al pagarse). Un pedido cancelado o abandonado
 * libera lo que apartaba. Así dos canales no le prometen la misma unidad a dos personas.
 */
export async function reservedByProduct(tenantId: string, productIds: readonly string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!productIds.length) return out;
  const open = await db.orm.public.StoreOrder.where({ tenantId, status: "PENDING_PAYMENT" }).where((o) => o.fulfillment.neq("CANCELED")).select("id").limit(5000).all();
  if (!open.length) return out;
  const lines = await db.orm.public.StoreOrderLine.where({ tenantId }).where((l) => l.orderId.in(open.map((o) => o.id))).where((l) => l.productId.in([...productIds])).select("productId", "quantity").limit(20_000).all();
  for (const l of lines) out.set(l.productId, (out.get(l.productId) ?? 0) + l.quantity);
  return out;
}

/** Lo que se puede prometer hoy: existencias menos lo apartado (nunca negativo). */
export const availableStock = (stock: number, reserved: number) => Math.max(0, stock - reserved);
