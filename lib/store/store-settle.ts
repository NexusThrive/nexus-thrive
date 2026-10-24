import type { DocumentLineInput } from "@/lib/business/commercial-document";
import { emitEvent } from "@/lib/events/outbox";
import { toNumber } from "@/lib/format";
import { applyStockMovement, StockError } from "@/lib/inventory/stock-service";
import type { MoneyTx } from "@/lib/business/money-service";
import { orderCode } from "./cart";

/**
 * Liquidación de un pedido de la tienda cuando su cobro queda confirmado (dentro de la MISMA transacción del cobro):
 * las líneas del pedido son las del documento de venta y se descuentan las existencias. Si no alcanzan, el dinero
 * ya llegó: el pedido queda pagado y marcado «para revisar» en vez de deshacer el cobro.
 */
export async function storeOrderLines(tx: MoneyTx, tenantId: string, intentId: string): Promise<{ orderId: string; lines: DocumentLineInput[] } | null> {
  const order = await tx.orm.public.StoreOrder.where({ tenantId, intentId }).first();
  if (!order) return null;
  const lines = await tx.orm.public.StoreOrderLine.where({ tenantId, orderId: order.id }).all();
  return { orderId: order.id, lines: lines.map((l) => ({ description: l.name, quantity: l.quantity, unitPrice: toNumber(l.unitPrice), productId: l.productId, taxRatePct: toNumber(l.taxRatePct) })) };
}

export async function settleStoreOrder(tx: MoneyTx, tenantId: string, orderId: string, documentId: string | null, userId: string | null): Promise<void> {
  const order = await tx.orm.public.StoreOrder.where({ tenantId, id: orderId }).first();
  if (!order || order.status === "PAID" || order.status === "CANCELED") return;
  const lines = await tx.orm.public.StoreOrderLine.where({ tenantId, orderId }).all();
  let review: string | null = null;
  for (const l of lines) {
    const p = await tx.orm.public.Product.where({ tenantId, id: l.productId }).select("trackStock", "name").first();
    if (!p?.trackStock) continue;
    try {
      await applyStockMovement(tx, tenantId, { productId: l.productId, kind: "SALE", quantity: l.quantity, note: `Pedido ${orderCode(order.number)}`, userId, documentType: "SALE", documentId });
    } catch (e) {
      if (!(e instanceof StockError)) throw e;
      review = `Sin existencias suficientes de «${p.name}»: revisa el pedido y coordina con el cliente.`;
    }
  }
  await tx.orm.public.StoreOrder.where({ tenantId, id: orderId }).update({ status: "PAID", paidAt: Temporal.Instant.fromEpochMilliseconds(Date.now()), documentId, review });
  await emitEvent(tx, tenantId, { type: "order.paid", resourceType: "store_order", resourceId: orderId, payload: { order_id: orderId, code: orderCode(order.number), total: toNumber(order.total), currency: "COP", needs_review: review !== null, document_id: documentId } });
}
