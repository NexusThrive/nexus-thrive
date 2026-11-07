import { toNumber } from "@/lib/foundation/format";
import { db } from "@/prisma/db";
import { balanceDueOnDelivery, dispatchProblems, isMethod, type DeliveryInput, type DeliveryMethod } from "./delivery";
import { advanceOrder } from "./fulfillment-db";

/** Entrega de un pedido por `tenantId`. Despachar guarda el método y marca «enviado»; confirmar marca «entregado» y avisa si queda saldo por cobrar. */
export type DeliveryRow = { method: DeliveryMethod; carrier: string | null; trackingCode: string | null; scheduledFor: string | null; deliveredAt: string | null; receivedBy: string | null; note: string | null };
type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string; fields?: Record<string, string> };

const day = (iso: string) => Temporal.Instant.from(`${iso}T12:00:00-05:00`);

export async function getDelivery(tenantId: string, orderId: string): Promise<DeliveryRow | null> {
  const d = await db.orm.public.Delivery.where({ tenantId, orderId }).first();
  return d ? { method: d.method as DeliveryMethod, carrier: d.carrier, trackingCode: d.trackingCode, scheduledFor: d.scheduledFor ? String(d.scheduledFor) : null, deliveredAt: d.deliveredAt ? String(d.deliveredAt) : null, receivedBy: d.receivedBy, note: d.note } : null;
}

/** Guarda la entrega (crea o reemplaza los datos) y pasa el pedido de «listo» a «enviado». */
export async function dispatchOrder(tenantId: string, orderId: string, input: DeliveryInput, byId: string | null): Promise<Result> {
  const fields = dispatchProblems(input);
  if (Object.keys(fields).length > 0) return { ok: false, message: "Revisa los datos de la entrega.", fields };
  const order = await db.orm.public.StoreOrder.where({ tenantId, id: orderId }).first();
  if (!order) return { ok: false, message: "No se encontró el pedido." };
  if (order.fulfillment !== "READY") return { ok: false, message: "Solo se envía un pedido que está listo." };
  const moved = await advanceOrder(tenantId, orderId, "SHIPPED", byId, input.method === "COURIER" ? `Guía ${input.trackingCode?.trim()}` : "Reparto propio");
  if (!moved.ok) return moved;
  const data = { method: input.method, carrier: input.carrier?.trim() || null, trackingCode: input.trackingCode?.trim() || null, scheduledFor: input.scheduledFor ? day(input.scheduledFor) : null, note: input.note?.trim().slice(0, 200) || null };
  const existing = await db.orm.public.Delivery.where({ tenantId, orderId }).first();
  if (existing) await db.orm.public.Delivery.where({ tenantId, orderId }).update(data);
  else await db.orm.public.Delivery.create({ tenantId, orderId, ...data });
  return { ok: true };
}

/** Confirma la entrega: pasa a «entregado», anota quién recibió y devuelve el saldo por cobrar si el pedido no está pagado. */
export async function confirmDelivery(tenantId: string, orderId: string, receivedBy: string, byId: string | null): Promise<Result<{ balanceDue: number }>> {
  const order = await db.orm.public.StoreOrder.where({ tenantId, id: orderId }).first();
  if (!order) return { ok: false, message: "No se encontró el pedido." };
  const moved = await advanceOrder(tenantId, orderId, "DELIVERED", byId, receivedBy.trim() ? `Recibió ${receivedBy.trim().slice(0, 80)}` : null);
  if (!moved.ok) return moved;
  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
  const done = { deliveredAt: now, receivedBy: receivedBy.trim().slice(0, 80) || null };
  const existing = await db.orm.public.Delivery.where({ tenantId, orderId }).first();
  if (existing) await db.orm.public.Delivery.where({ tenantId, orderId }).update(done);
  else await db.orm.public.Delivery.create({ tenantId, orderId, method: "PICKUP", ...done });
  return { ok: true, balanceDue: balanceDueOnDelivery(order.status, toNumber(order.total as never)) };
}

export { isMethod };
