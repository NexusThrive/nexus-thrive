import { emitEvent } from "@/lib/core/events/outbox";
import { toNumber } from "@/lib/foundation/format";
import { resolveLimits, validateAmount } from "@/lib/foundation/kernel/integrity";
import { findOrCreateContact } from "@/lib/business/customers/contacts-db";
import { openObligation } from "@/lib/business/sales/obligations";
import { db } from "@/prisma/db";
import { cleanExternalId, normalizeCart, orderCode, orderTotals, validateCustomer, type CartLine, type CustomerData, type OrderChannel } from "./cart";

/**
 * Pedido que entra por un canal distinto de la tienda propia (API, WhatsApp, Shopify, WooCommerce…): la misma persona de siempre
 * (un contacto por teléfono), el mismo pedido y la misma deuda en cartera, pero sin enlace de cobro automático: el negocio cobra
 * por el medio que acordó. El precio sale de la base, nunca de quien llama. Con `externalId` es idempotente: repetir el pedido
 * del canal devuelve el que ya existe.
 */
export type ChannelOrderInput = {
  channel: OrderChannel;
  externalId?: string | null;
  customer: Pick<CustomerData, "name" | "phone"> & Partial<Pick<CustomerData, "email" | "address" | "city" | "notes">>;
  lines: CartLine[];
};
export type ChannelOrderResult =
  | { ok: true; id: string; code: string; total: number; duplicate: boolean }
  | { ok: false; message: string; code: "invalid" | "unavailable" | "limit" };

export async function createChannelOrder(tenantId: string, input: ChannelOrderInput): Promise<ChannelOrderResult> {
  const externalId = cleanExternalId(input.externalId);
  const c: CustomerData = { name: input.customer.name, phone: input.customer.phone, email: input.customer.email ?? "", address: input.customer.address ?? "", city: input.customer.city ?? "", notes: input.customer.notes ?? "" };
  const problems = validateCustomer(c);
  if (Object.keys(problems).length) return { ok: false, code: "invalid", message: Object.values(problems).join(" ") };
  const cart = normalizeCart(input.lines);
  if (!cart.ok) return { ok: false, code: "invalid", message: cart.message };

  if (externalId) {
    const found = await db.orm.public.StoreOrder.where({ tenantId, channel: input.channel, externalId }).first();
    if (found) return { ok: true, id: found.id, code: orderCode(found.number), total: toNumber(found.total), duplicate: true };
  }

  const tenant = await db.orm.public.Tenant.where({ id: tenantId, active: true }).first();
  if (!tenant) return { ok: false, code: "unavailable", message: "El negocio no está disponible." };
  const products = await db.orm.public.Product.where({ tenantId, active: true, sellable: true }).where((p) => p.id.in(cart.lines.map((l) => l.productId))).all();
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: { productId: string; name: string; quantity: number; unitPrice: number; taxRatePct: number }[] = [];
  for (const l of cart.lines) {
    const p = byId.get(l.productId);
    if (!p || !(p.kind === "PRODUCT" || p.kind === "SERVICE")) return { ok: false, code: "unavailable", message: "Un producto del pedido no existe o no se vende." };
    if (p.trackStock && l.quantity > p.stock) return { ok: false, code: "unavailable", message: `De «${p.name}» solo quedan ${p.stock}.` };
    lines.push({ productId: p.id, name: p.name, quantity: l.quantity, unitPrice: toNumber(p.price), taxRatePct: p.taxCategory === "GRAVADO" ? toNumber(p.taxRatePct) : 0 });
  }
  const total = orderTotals(lines.map((l) => ({ description: l.name, quantity: l.quantity, unitPrice: l.unitPrice, taxRatePct: l.taxRatePct }))).total;
  if (validateAmount(total, resolveLimits(tenant.settings))) return { ok: false, code: "limit", message: "El pedido supera el valor máximo permitido." };

  for (let attempt = 0; ; attempt++) {
    try {
      const order = await db.transaction(async (tx) => {
        const last = await tx.orm.public.StoreOrder.where({ tenantId }).orderBy((o) => o.number.desc()).first();
        const number = (last?.number ?? 0) + 1;
        const contact = await findOrCreateContact(tx, tenantId, { name: c.name, phone: c.phone, email: c.email, source: input.channel === "WHATSAPP" ? "WHATSAPP" : "STORE", stage: "PROSPECT" });
        const created = await tx.orm.public.StoreOrder.create({
          tenantId, customerId: contact?.id ?? null, number, channel: input.channel, externalId, customerName: c.name.trim().slice(0, 120), phone: c.phone.trim().slice(0, 30),
          email: c.email.trim().toLowerCase().slice(0, 120) || null, address: c.address.trim().slice(0, 200) || null, city: c.city.trim().slice(0, 80) || null, notes: c.notes.trim().slice(0, 300) || null, total: total.toFixed(2),
        });
        await tx.orm.public.StoreOrderLine.createAll(lines.map((l) => ({ tenantId, orderId: created.id, productId: l.productId, name: l.name.slice(0, 160), quantity: l.quantity, unitPrice: l.unitPrice.toFixed(2), taxRatePct: l.taxRatePct.toFixed(2) }))).toArray();
        await tx.orm.public.OrderStatusChange.create({ tenantId, orderId: created.id, fromStatus: null, toStatus: "RECEIVED", note: `Pedido recibido por ${input.channel}${externalId ? ` (${externalId})` : ""}` });
        await openObligation(tx, tenantId, { originType: "STORE_ORDER", originId: created.id, debtorName: c.name, description: `Pedido ${orderCode(number)}`, amount: total, dueDate: Temporal.Instant.fromEpochMilliseconds(Date.now() + 7 * 24 * 3_600_000) });
        await emitEvent(tx, tenantId, { type: "order.created", resourceType: "store_order", resourceId: created.id, payload: { order_id: created.id, code: orderCode(number), total, currency: "COP", channel: input.channel, external_id: externalId, customer: { name: c.name.trim() } } });
        return created;
      });
      return { ok: true, id: order.id, code: orderCode(order.number), total, duplicate: false };
    } catch (error) {
      const text = String((error as Error)?.message ?? error);
      // Dos llamadas a la vez con el mismo identificador: gana la primera y la otra devuelve ese pedido.
      if (externalId && /StoreOrder_tenantId_channel_externalId/i.test(text)) {
        const found = await db.orm.public.StoreOrder.where({ tenantId, channel: input.channel, externalId }).first();
        if (found) return { ok: true, id: found.id, code: orderCode(found.number), total: toNumber(found.total), duplicate: true };
      }
      if (attempt < 4 && /StoreOrder_tenantId_number|unique|duplicate/i.test(text)) continue;
      throw error;
    }
  }
}

/** Líneas de un canal externo: por id del producto o por SKU. Devuelve las líneas con id o el SKU que no se encontró. */
export async function resolveLineProducts(tenantId: string, lines: { product_id?: string; sku?: string; quantity: number }[]): Promise<{ ok: true; lines: CartLine[] } | { ok: false; message: string }> {
  const skus = [...new Set(lines.flatMap((l) => (l.sku ? [l.sku.trim()] : [])))];
  const bySku = new Map<string, string>();
  if (skus.length) {
    const found = await db.orm.public.Product.where({ tenantId, active: true }).where((p) => p.sku.in(skus)).select("id", "sku").limit(200).all();
    for (const p of found) if (p.sku) bySku.set(p.sku, p.id);
  }
  const out: CartLine[] = [];
  for (const l of lines) {
    const productId = l.product_id ?? bySku.get((l.sku ?? "").trim());
    if (!productId) return { ok: false, message: `No encontramos el producto con SKU «${l.sku}» en este negocio.` };
    out.push({ productId, quantity: l.quantity });
  }
  return { ok: true, lines: out };
}
