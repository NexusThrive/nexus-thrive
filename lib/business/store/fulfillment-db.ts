import { emitEvent } from "@/lib/core/events/outbox";
import { toNumber } from "@/lib/foundation/format";
import type { DbTransaction } from "@/lib/foundation/db/db-transaction";
import { db } from "@/prisma/db";
import { orderCode } from "./cart";
import { FULFILLMENT_TEXT, isFulfillment, transitionProblem, type Fulfillment } from "./fulfillment";

/** Cumplimiento de los pedidos (HU-pedidos-01). El cambio se reclama con un UPDATE condicional sobre el estado actual: dos clics no duplican el historial. Todo por `tenantId`. */
export type HistoryRow = { id: string; fromStatus: Fulfillment | null; toStatus: Fulfillment; byId: string | null; note: string | null; createdAt: string };
type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

/** Anota el cambio, publica `order.status_changed` y devuelve el pedido. Va dentro de la transacción de quien cambia el estado. */
async function record(tx: DbTransaction, tenantId: string, order: { id: string; number: number; total: unknown }, from: string | null, to: Fulfillment, byId: string | null, note: string | null): Promise<void> {
  await tx.orm.public.OrderStatusChange.create({ tenantId, orderId: order.id, fromStatus: from, toStatus: to, byId, note });
  await emitEvent(tx, tenantId, { type: "order.status_changed", resourceType: "store_order", resourceId: order.id, payload: { order_id: order.id, code: orderCode(order.number), from, to, total: toNumber(order.total as never), currency: "COP", changed_by: byId, note } });
}

/**
 * Cambia el cumplimiento de un pedido si la transición es válida. Un pedido cancelado en el pago no avanza; cancelar el cumplimiento
 * de uno ya pagado no devuelve el dinero (eso se hace desde Cobros en línea).
 */
export async function advanceOrder(tenantId: string, orderId: string, to: string, byId: string | null, note?: string | null): Promise<Result<{ from: Fulfillment; to: Fulfillment }>> {
  if (!isFulfillment(to)) return { ok: false, message: "Ese estado no existe." };
  return db.transaction(async (tx) => {
    const order = await tx.orm.public.StoreOrder.where({ tenantId, id: orderId }).first();
    if (!order) return { ok: false as const, message: "No se encontró el pedido." };
    const problem = transitionProblem(order.fulfillment, to);
    if (problem) return { ok: false as const, message: problem };
    if (order.status === "CANCELED" || order.status === "ABANDONED") return { ok: false as const, message: "El pedido está cancelado: ya no avanza." };
    const claim = tx.sql.public.StoreOrder.update({ fulfillment: to })
      .where((f, fns) => fns.and(fns.eq(f.id, orderId), fns.eq(f.tenantId, tenantId), fns.eq(f.fulfillment, order.fulfillment)))
      .returning("id")
      .build();
    if ((await tx.query(claim)).length === 0) return { ok: false as const, message: "El pedido cambió mientras lo movías. Vuelve a intentarlo." };
    await record(tx, tenantId, order, order.fulfillment, to, byId, note?.trim().slice(0, 200) || null);
    return { ok: true as const, from: order.fulfillment as Fulfillment, to };
  });
}

/** El pedido se canceló en el pago: su cumplimiento también (si aún no era final), anotado como hecho del sistema. */
export async function cancelFulfillment(tx: DbTransaction, tenantId: string, orderId: string, reason: string): Promise<void> {
  const order = await tx.orm.public.StoreOrder.where({ tenantId, id: orderId }).first();
  if (!order || order.fulfillment === "CANCELED" || order.fulfillment === "DELIVERED") return;
  await tx.orm.public.StoreOrder.where({ tenantId, id: orderId }).update({ fulfillment: "CANCELED" });
  await record(tx, tenantId, order, order.fulfillment, "CANCELED", null, reason);
}

/** Historial de un pedido, del más antiguo al más reciente. */
export async function orderHistory(tenantId: string, orderId: string): Promise<HistoryRow[]> {
  const rows = await db.orm.public.OrderStatusChange.where({ tenantId, orderId }).orderBy((c) => c.createdAt.asc()).limit(100).all();
  return rows.map((c) => ({ id: c.id, fromStatus: (c.fromStatus as Fulfillment | null) ?? null, toStatus: c.toStatus as Fulfillment, byId: c.byId, note: c.note, createdAt: String(c.createdAt) }));
}

export { FULFILLMENT_TEXT };
