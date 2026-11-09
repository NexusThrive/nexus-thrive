import { db } from "@/prisma/db";
import { orderCode } from "./cart";
import { advanceOrder } from "./fulfillment-db";
import { allDone, canMoveStage, isStage, type ProductionStage } from "./production";

/** Órdenes de producción por `tenantId`. Se crean al pasar el pedido a «en producción» (una por línea, sin duplicar). */
export type ProductionRow = { id: string; orderId: string; orderCode: string; productName: string; quantity: number; stage: ProductionStage; assigneeId: string | null; note: string | null };
type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

/** Tablero: órdenes no terminadas (o todas si `includeDone`), de la más antigua a la más reciente. */
export async function listProduction(tenantId: string, opts: { includeDone?: boolean; assigneeId?: string } = {}): Promise<ProductionRow[]> {
  let q = db.orm.public.ProductionOrder.where({ tenantId });
  if (opts.assigneeId) q = q.where({ assigneeId: opts.assigneeId });
  const rows = (await q.orderBy((p) => p.createdAt.asc()).limit(300).all()).filter((p) => opts.includeDone || p.stage !== "DONE");
  const orders = await db.orm.public.StoreOrder.where({ tenantId }).all();
  const num = new Map(orders.map((o) => [o.id, o.number]));
  return rows.map((p) => ({ id: p.id, orderId: p.orderId, orderCode: orderCode(num.get(p.orderId) ?? 0), productName: p.productName, quantity: p.quantity, stage: p.stage as ProductionStage, assigneeId: p.assigneeId, note: p.note }));
}

/** Mueve una orden de etapa. Si con ello todas las del pedido quedan terminadas, el pedido pasa a «listo». */
export async function moveProduction(tenantId: string, id: string, to: string, byId: string | null): Promise<Result<{ orderReady: boolean }>> {
  if (!isStage(to)) return { ok: false, message: "Esa etapa no existe." };
  const outcome = await db.transaction(async (tx) => {
    const p = await tx.orm.public.ProductionOrder.where({ tenantId, id }).first();
    if (!p) return { ok: false as const, message: "No se encontró la orden de producción." };
    if (!canMoveStage(p.stage, to)) return { ok: false as const, message: p.stage === to ? "La orden ya está en esa etapa." : "Una orden terminada ya no cambia de etapa." };
    const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
    const claim = tx.sql.public.ProductionOrder.update({ stage: to, ...(to === "IN_PROGRESS" ? { startedAt: now } : {}), doneAt: to === "DONE" ? now : null })
      .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.stage, p.stage)))
      .returning("id")
      .build();
    if ((await tx.query(claim)).length === 0) return { ok: false as const, message: "La orden cambió mientras la movías. Vuelve a intentarlo." };
    const stages = (await tx.orm.public.ProductionOrder.where({ tenantId, orderId: p.orderId }).all()).map((x) => (x.id === id ? to : x.stage));
    return { ok: true as const, orderId: p.orderId, ready: allDone(stages) };
  });
  if (!outcome.ok) return outcome;
  if (!outcome.ready) return { ok: true, orderReady: false };
  // Fuera de la transacción: si el pedido ya no puede pasar a listo (cancelado), la orden igual queda terminada.
  const moved = await advanceOrder(tenantId, outcome.orderId, "READY", byId, "Producción terminada");
  return { ok: true, orderReady: moved.ok };
}

/** Asigna (o quita, con `null`) al responsable de una orden. */
export async function assignProduction(tenantId: string, id: string, assigneeId: string | null): Promise<Result> {
  const p = await db.orm.public.ProductionOrder.where({ tenantId, id }).first();
  if (!p) return { ok: false, message: "No se encontró la orden de producción." };
  await db.orm.public.ProductionOrder.where({ tenantId, id }).update({ assigneeId });
  return { ok: true };
}
