import { emitEvent } from "@/lib/events/outbox";
import { toNumber } from "@/lib/format";
import { connectedGateways, createIntent } from "@/lib/payments/intents-db";
import { db } from "@/prisma/db";
import { ABANDON_AFTER_MINUTES, isAbandoned, normalizeCart, orderCode, orderMessage, orderTotals, validateCustomer, type CartLine, type CustomerData } from "./cart";

/** Tienda en línea (servidor). El sitio público se resuelve por su dirección; todo lo demás va por `tenantId` del negocio dueño. */
export type PlaceResult =
  | { ok: true; code: string; reference: string; total: number; whatsappText: string; whatsapp: string | null; business: string }
  | { ok: false; message: string; fields?: Partial<Record<keyof CustomerData, string>> };

export async function placeOrder(siteSlug: string, input: { customer: CustomerData; lines: CartLine[] }): Promise<PlaceResult> {
  const cfg = await db.orm.public.SiteConfig.where({ siteSlug, enabled: true }).first();
  if (!cfg || !cfg.showCatalog) return { ok: false, message: "Esta tienda no está disponible." };
  const tenant = await db.orm.public.Tenant.where({ id: cfg.tenantId, active: true }).first();
  if (!tenant) return { ok: false, message: "Esta tienda no está disponible." };
  const tenantId = tenant.id;
  const fields = validateCustomer(input.customer);
  if (Object.keys(fields).length) return { ok: false, message: "Revisa los datos marcados.", fields };
  const cart = normalizeCart(input.lines);
  if (!cart.ok) return cart;

  const products = await db.orm.public.Product.where({ tenantId, active: true, publishedOnline: true }).where((p) => p.id.in(cart.lines.map((l) => l.productId))).all();
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: { productId: string; name: string; quantity: number; unitPrice: number; taxRatePct: number }[] = [];
  for (const l of cart.lines) {
    const p = byId.get(l.productId);
    if (!p || !(p.kind === "PRODUCT" || p.kind === "SERVICE")) return { ok: false, message: "Un producto de tu carrito ya no está disponible. Actualiza la página." };
    if (p.trackStock && l.quantity > p.stock) return { ok: false, message: `De «${p.name}» solo quedan ${p.stock}.` };
    lines.push({ productId: p.id, name: p.name, quantity: l.quantity, unitPrice: toNumber(p.price), taxRatePct: p.taxCategory === "GRAVADO" ? toNumber(p.taxRatePct) : 0 });
  }
  const total = orderTotals(lines.map((l) => ({ description: l.name, quantity: l.quantity, unitPrice: l.unitPrice, taxRatePct: l.taxRatePct }))).total;

  const c = input.customer;
  for (let attempt = 0; ; attempt++) {
    try {
      const gateway = (await connectedGateways(tenantId))[0]?.value ?? "sandbox";
      const order = await db.transaction(async (tx) => {
        const last = await tx.orm.public.StoreOrder.where({ tenantId }).orderBy((o) => o.number.desc()).first();
        const number = (last?.number ?? 0) + 1;
        const created = await tx.orm.public.StoreOrder.create({ tenantId, number, customerName: c.name.trim().slice(0, 120), phone: c.phone.trim().slice(0, 30), email: c.email.trim().toLowerCase().slice(0, 120) || null, address: c.address.trim().slice(0, 200) || null, city: c.city.trim().slice(0, 80) || null, notes: c.notes.trim().slice(0, 300) || null, total: total.toFixed(2) });
        await tx.orm.public.StoreOrderLine.createAll(lines.map((l) => ({ tenantId, orderId: created.id, productId: l.productId, name: l.name.slice(0, 160), quantity: l.quantity, unitPrice: l.unitPrice.toFixed(2), taxRatePct: l.taxRatePct.toFixed(2) }))).toArray();
        return created;
      });
      const intent = await createIntent(tenantId, { amount: total, description: `Pedido ${orderCode(order.number)} · ${tenant.name}`, expiresInHours: 72, provider: gateway }, "tienda");
      if (!intent.ok) {
        await db.orm.public.StoreOrder.where({ tenantId, id: order.id }).update({ status: "CANCELED", review: `No se pudo crear el cobro: ${intent.message}` });
        return { ok: false, message: "No pudimos generar el cobro de tu pedido. Escríbenos por WhatsApp." };
      }
      await db.orm.public.StoreOrder.where({ tenantId, id: order.id }).update({ intentId: intent.id });
      await db.transaction((tx) => emitEvent(tx, tenantId, { type: "order.created", resourceType: "store_order", resourceId: order.id, payload: { order_id: order.id, code: orderCode(order.number), total, currency: "COP", customer: { name: c.name.trim(), phone: c.phone.trim(), email: c.email.trim() || null }, items: lines.map((l) => ({ product_id: l.productId, name: l.name, quantity: l.quantity, unit_price: l.unitPrice })) } }));
      const code = orderCode(order.number);
      return { ok: true, code, reference: intent.reference, total, business: tenant.name, whatsapp: tenant.whatsappNumber, whatsappText: orderMessage({ code, business: tenant.name, lines, total, customer: c }) };
    } catch (error) {
      if (attempt < 4 && /StoreOrder_tenantId_number|unique|duplicate/i.test(String((error as Error)?.message ?? error))) continue;
      throw error;
    }
  }
}

export type OrderRow = { id: string; code: string; status: string; customerName: string; phone: string; email: string | null; address: string | null; city: string | null; notes: string | null; total: number; review: string | null; createdAt: string; reference: string | null; lines: { name: string; quantity: number; unitPrice: number }[] };

export async function listOrders(tenantId: string, limit = 100): Promise<OrderRow[]> {
  const orders = await db.orm.public.StoreOrder.where({ tenantId }).orderBy((o) => o.number.desc()).limit(limit).all();
  if (!orders.length) return [];
  const [lines, intents] = await Promise.all([
    db.orm.public.StoreOrderLine.where({ tenantId }).where((l) => l.orderId.in(orders.map((o) => o.id))).all(),
    db.orm.public.PaymentIntent.where({ tenantId }).where((i) => i.id.in(orders.map((o) => o.intentId).filter((x): x is string => Boolean(x)))).select("id", "reference").all(),
  ]);
  const ref = new Map(intents.map((i) => [i.id, i.reference]));
  return orders.map((o) => ({ id: o.id, code: orderCode(o.number), status: o.status, customerName: o.customerName, phone: o.phone, email: o.email, address: o.address, city: o.city, notes: o.notes, total: toNumber(o.total), review: o.review, createdAt: String(o.createdAt), reference: o.intentId ? (ref.get(o.intentId) ?? null) : null, lines: lines.filter((l) => l.orderId === o.id).map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: toNumber(l.unitPrice) })) }));
}

/** Cancela un pedido que aún no se pagó (y su enlace de cobro). */
export async function cancelOrder(tenantId: string, id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const o = await db.orm.public.StoreOrder.where({ tenantId, id }).first();
  if (!o) return { ok: false, message: "No se encontró el pedido." };
  if (o.status === "PAID") return { ok: false, message: "Un pedido pagado no se cancela: se devuelve el dinero desde Cobros en línea." };
  await db.orm.public.StoreOrder.where({ tenantId, id }).update({ status: "CANCELED" });
  if (o.intentId) {
    const plan = db.sql.public.PaymentIntent.update({ status: "CANCELED" }).where((f, fns) => fns.and(fns.eq(f.id, o.intentId!), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "PENDING"))).returning("id").build();
    await db.transaction((tx) => tx.query(plan));
  }
  return { ok: true };
}

/**
 * Carritos abandonados (cron): los pedidos sin pagar pasado el tiempo se marcan y disparan UN evento
 * `cart.abandoned` (para que n8n le escriba al cliente). No se repite.
 */
export async function markAbandonedOrders(nowMs = Date.now(), tenantIds?: readonly string[]): Promise<number> {
  const cutoff = Temporal.Instant.fromEpochMilliseconds(nowMs - ABANDON_AFTER_MINUTES * 60_000);
  const only = tenantIds ? [...tenantIds] : null;
  const candidates = await db.orm.public.StoreOrder.where({ status: "PENDING_PAYMENT" }).where((o) => o.abandonedNotifiedAt.isNull()).where((o) => o.createdAt.lte(cutoff)).where((o) => (only ? o.tenantId.in(only) : o.status.eq("PENDING_PAYMENT"))).limit(200).all();
  let n = 0;
  for (const o of candidates) {
    if (!isAbandoned(Date.parse(String(o.createdAt)), nowMs)) continue;
    // Reclamo: solo quien pasa el pedido de PENDING_PAYMENT a ABANDONED emite el evento (una sola vez).
    const claim = db.sql.public.StoreOrder.update({ status: "ABANDONED", abandonedNotifiedAt: Temporal.Instant.fromEpochMilliseconds(nowMs) }).where((f, fns) => fns.and(fns.eq(f.id, o.id), fns.eq(f.status, "PENDING_PAYMENT"))).returning("id").build();
    const won = await db.transaction(async (tx) => {
      if ((await tx.query(claim)).length === 0) return false;
      await emitEvent(tx, o.tenantId, { type: "cart.abandoned", resourceType: "store_order", resourceId: o.id, payload: { order_id: o.id, code: orderCode(o.number), total: toNumber(o.total), customer: { name: o.customerName, phone: o.phone, email: o.email } } });
      return true;
    });
    if (won) n++;
  }
  return n;
}
