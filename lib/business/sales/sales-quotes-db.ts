import { toNumber } from "@/lib/foundation/format";
import { emitEvent } from "@/lib/core/events/outbox";
import { todayCO } from "@/lib/foundation/dates/plain-date";
import { documentTotals } from "./commercial-document";
import { openObligation } from "./obligations";
import { isQuoteExpired, splitDeposit, validateQuote, type QuoteDraft, type QuoteStatus } from "./sales-quotes";
import { db } from "@/prisma/db";

/**
 * Cotizaciones comerciales (HU-cotizacion-01). Aprobar una cotización crea el PEDIDO con sus líneas y deja el anticipo y el saldo como
 * obligaciones (visibles en la cartera). La aprobación se reclama con un UPDATE condicional: dos clics crean un solo pedido.
 * Todo por `tenantId`.
 */
export type QuoteRow = { id: string; number: number; title: string; customerId: string; customerName: string; status: QuoteStatus; total: number; depositPct: number; validUntil: string | null; orderId: string | null; decisionNote: string | null; lines: { name: string; quantity: number; unitPrice: number }[]; createdAt: string };
type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const dec = (n: number) => n.toFixed(2);
const isCollision = (e: unknown) => /SalesQuote_tenantId_number|StoreOrder_tenantId_number|unique|duplicate/i.test(String((e as Error)?.message ?? e));

/** Crea una cotización en borrador con precios del catálogo (se pueden cambiar por línea). */
export async function createSalesQuote(tenantId: string, input: QuoteDraft & { customerId: string; notes?: string | null }, userId: string): Promise<Result<{ id: string; number: number }>> {
  const problem = validateQuote(input);
  if (problem) return { ok: false, message: problem };
  if (!(await db.orm.public.Customer.where({ tenantId, id: input.customerId }).select("id").first())) return { ok: false, message: "El cliente no existe en este negocio." };
  const products = await db.orm.public.Product.where({ tenantId, active: true }).where((p) => p.id.in(input.lines.map((l) => l.productId))).all();
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: { productId: string; name: string; quantity: number; unitPrice: number; taxRatePct: number }[] = [];
  for (const l of input.lines) {
    const p = byId.get(l.productId);
    if (!p) return { ok: false, message: "Un producto de la cotización ya no está disponible." };
    lines.push({ productId: p.id, name: p.name, quantity: l.quantity, unitPrice: l.unitPrice, taxRatePct: p.taxCategory === "GRAVADO" ? toNumber(p.taxRatePct) : 0 });
  }
  const totals = documentTotals(lines.map((l) => ({ description: l.name, quantity: l.quantity, unitPrice: l.unitPrice, taxRatePct: l.taxRatePct })));
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const last = await tx.orm.public.SalesQuote.where({ tenantId }).orderBy((q) => q.number.desc()).first();
        const number = (last?.number ?? 0) + 1;
        const q = await tx.orm.public.SalesQuote.create({ tenantId, number, customerId: input.customerId, title: input.title.trim().slice(0, 160), depositPct: dec(input.depositPct), validUntil: input.validUntil || null, notes: input.notes?.trim().slice(0, 500) || null, subtotal: dec(totals.subtotal), taxTotal: dec(totals.taxTotal), total: dec(totals.total), createdById: userId });
        await tx.orm.public.SalesQuoteLine.createAll(lines.map((l) => ({ tenantId, quoteId: q.id, productId: l.productId, name: l.name.slice(0, 160), quantity: l.quantity, unitPrice: dec(l.unitPrice), taxRatePct: dec(l.taxRatePct) }))).toArray();
        return { ok: true as const, id: q.id, number };
      });
    } catch (e) {
      if (attempt < 4 && isCollision(e)) continue;
      throw e;
    }
  }
}

async function transition(tenantId: string, id: string, from: QuoteStatus[], to: QuoteStatus, extra: Record<string, unknown> = {}): Promise<boolean> {
  const plan = db.sql.public.SalesQuote.update({ status: to, ...extra })
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.or(...from.map((s) => fns.eq(f.status, s)))))
    .returning("id")
    .build();
  return (await db.transaction((tx) => tx.query(plan))).length > 0;
}

/** Marca la cotización como enviada al cliente. */
export async function sendSalesQuote(tenantId: string, id: string): Promise<Result> {
  return (await transition(tenantId, id, ["DRAFT"], "SENT", { sentAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) })) ? { ok: true } : { ok: false, message: "Solo se envía una cotización en borrador." };
}

/** El cliente rechazó la cotización. */
export async function rejectSalesQuote(tenantId: string, id: string, note: string): Promise<Result> {
  if (note.trim().length < 3) return { ok: false, message: "Escribe por qué la rechazó el cliente." };
  return (await transition(tenantId, id, ["DRAFT", "SENT"], "REJECTED", { decidedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()), decisionNote: note.trim().slice(0, 300) })) ? { ok: true } : { ok: false, message: "Esa cotización ya fue decidida o no existe." };
}

/**
 * Aprueba la cotización: reclama la aprobación una sola vez, crea el pedido con sus líneas y abre el anticipo y el saldo como
 * obligaciones (el anticipo vence en 3 días y el saldo en 30). No toca el inventario: eso ocurre al cumplir el pedido.
 */
export async function approveSalesQuote(tenantId: string, id: string, decidedByName: string | null = null): Promise<Result<{ orderId: string; deposit: number; balance: number }>> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const q = await tx.orm.public.SalesQuote.where({ tenantId, id }).first();
        if (!q || (q.status !== "DRAFT" && q.status !== "SENT")) return { ok: false as const, message: "Esa cotización ya fue decidida o no existe." };
        if (isQuoteExpired(q.validUntil, todayCO())) return { ok: false as const, message: `La cotización venció el ${q.validUntil}. Crea una nueva o ajusta la vigencia.` };
        const claim = tx.sql.public.SalesQuote.update({ status: "APPROVED", decidedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()), decidedByName })
          .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.or(fns.eq(f.status, "DRAFT"), fns.eq(f.status, "SENT"))))
          .returning("id")
          .build();
        if ((await tx.query(claim)).length === 0) return { ok: false as const, message: "Esa cotización ya fue decidida." };
        const customer = await tx.orm.public.Customer.where({ tenantId, id: q.customerId }).select("name", "phone", "email", "city").first();
        const lines = await tx.orm.public.SalesQuoteLine.where({ tenantId, quoteId: id }).all();
        const last = await tx.orm.public.StoreOrder.where({ tenantId }).orderBy((o) => o.number.desc()).first();
        const order = await tx.orm.public.StoreOrder.create({ tenantId, number: (last?.number ?? 0) + 1, customerId: q.customerId, quoteId: id, customerName: (customer?.name ?? "Cliente").slice(0, 120), phone: (customer?.phone ?? "").slice(0, 30), email: customer?.email ?? null, city: customer?.city ?? null, notes: `Cotización COT-${String(q.number).padStart(4, "0")}`, total: dec(toNumber(q.total)) });
        await tx.orm.public.StoreOrderLine.createAll(lines.map((l) => ({ tenantId, orderId: order.id, productId: l.productId, name: l.name, quantity: l.quantity, unitPrice: dec(toNumber(l.unitPrice)), taxRatePct: dec(toNumber(l.taxRatePct)) }))).toArray();
        await tx.orm.public.OrderStatusChange.create({ tenantId, orderId: order.id, fromStatus: null, toStatus: "RECEIVED", note: `Nació de la cotización COT-${String(q.number).padStart(4, "0")}` });
        await tx.orm.public.SalesQuote.where({ tenantId, id }).update({ orderId: order.id });
        const total = toNumber(q.total);
        const { deposit, balance } = splitDeposit(total, toNumber(q.depositPct));
        const day = 86_400_000;
        const base = { originType: "STORE_ORDER" as const, customerId: q.customerId, debtorName: customer?.name ?? "Cliente" };
        // El anticipo y el saldo son dos obligaciones del mismo pedido (`id` y `id:saldo`): un cobro baja primero la más próxima a vencer.
        await openObligation(tx, tenantId, { ...base, originId: order.id, description: `Anticipo · COT-${String(q.number).padStart(4, "0")}`, amount: deposit, dueDate: Temporal.Instant.fromEpochMilliseconds(Date.now() + 3 * day) });
        await openObligation(tx, tenantId, { ...base, originId: `${order.id}:saldo`, description: `Saldo · COT-${String(q.number).padStart(4, "0")}`, amount: balance, dueDate: Temporal.Instant.fromEpochMilliseconds(Date.now() + 30 * day) });
        await emitEvent(tx, tenantId, { type: "order.created", resourceType: "store_order", resourceId: order.id, payload: { order_id: order.id, code: `T-${String(order.number).padStart(4, "0")}`, total, currency: "COP", customer: { name: customer?.name ?? "Cliente", phone: customer?.phone ?? "", email: customer?.email ?? null }, items: lines.map((l) => ({ product_id: l.productId, name: l.name, quantity: l.quantity, unit_price: toNumber(l.unitPrice) })), source: "quote", quote_id: id } });
        return { ok: true as const, orderId: order.id, deposit, balance };
      });
    } catch (e) {
      if (attempt < 4 && isCollision(e)) continue;
      throw e;
    }
  }
}

/** Cotizaciones del negocio, las más recientes primero. */
export async function listSalesQuotes(tenantId: string, limit = 100): Promise<QuoteRow[]> {
  const rows = await db.orm.public.SalesQuote.where({ tenantId }).orderBy((q) => q.number.desc()).limit(limit).all();
  if (!rows.length) return [];
  const [customers, lines] = await Promise.all([
    db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in([...new Set(rows.map((r) => r.customerId))])).select("id", "name").all(),
    db.orm.public.SalesQuoteLine.where({ tenantId }).where((l) => l.quoteId.in(rows.map((r) => r.id))).all(),
  ]);
  const names = new Map(customers.map((c) => [c.id, c.name]));
  return rows.map((q) => ({ id: q.id, number: q.number, title: q.title, customerId: q.customerId, customerName: names.get(q.customerId) ?? "Cliente", status: q.status as QuoteStatus, total: toNumber(q.total), depositPct: toNumber(q.depositPct), validUntil: q.validUntil, orderId: q.orderId, decisionNote: q.decisionNote, lines: lines.filter((l) => l.quoteId === q.id).map((l) => ({ name: l.name, quantity: l.quantity, unitPrice: toNumber(l.unitPrice) })), createdAt: String(q.createdAt) }));
}
