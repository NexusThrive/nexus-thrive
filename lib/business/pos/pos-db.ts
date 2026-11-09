import { insertDocument } from "@/lib/business/sales/documents-db";
import { closeCashSession, openCashSession } from "@/lib/business/sales/finance-db";
import { MoneyError, moneyTransaction, recordIncome } from "@/lib/business/sales/money-service";
import { toNumber } from "@/lib/foundation/format";
import { emitEvent } from "@/lib/core/events/outbox";
import { StockError, applyStockMovement } from "@/lib/business/inventory/stock-service";
import { db } from "@/prisma/db";
import { priceListFor, pricingFor } from "@/lib/business/catalog/pricing-db";
import { tierPrice } from "@/lib/business/catalog/pricing";
import { cartTotals, lineDescription, settlePayments, tipFor, type PaymentInput } from "./cart";

/**
 * Punto de venta (servidor). Una terminal tiene su caja y su bodega; cada cajero abre
 * SU turno en ella. La venta lleva varias líneas, descuentos, propina y varios pagos, y
 * escribe todo (documento, pagos, caja, stock, evento) en una sola transacción. Los
 * precios, descuentos máximos e impuestos salen de la base, nunca del navegador.
 */
export type Terminal = { id: string; name: string; boxId: string; warehouseId: string | null; openTurn: { sessionId: string; cashierId: string; openedAt: string; openingAmount: number } | null };

/**
 * Crea una terminal de punto de venta con su propia caja (fondo en cero) y una bodega opcional. Valida el nombre y que la bodega sea del negocio.
 */
export async function createTerminal(tenantId: string, name: string, warehouseId: string | null): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const clean = name.trim().slice(0, 60);
  if (clean.length < 2) return { ok: false, message: "Ponle un nombre a la terminal." };
  if (warehouseId && !(await db.orm.public.Warehouse.where({ tenantId, id: warehouseId }).select("id").first())) return { ok: false, message: "La bodega no existe." };
  const box = await db.orm.public.CashBox.create({ tenantId, name: `Caja · ${clean}`, fundAmount: "0.00" });
  const t = await db.orm.public.PosTerminal.create({ tenantId, name: clean, boxId: box.id, warehouseId });
  return { ok: true, id: t.id };
}

/** Terminales activas con el turno abierto de cada una, si lo tienen. */
export async function listTerminals(tenantId: string): Promise<Terminal[]> {
  const terminals = await db.orm.public.PosTerminal.where({ tenantId, active: true }).orderBy((t) => t.createdAt.asc()).all();
  const open = await db.orm.public.CashSession.where({ tenantId }).where((s) => s.closedAt.isNull()).where((s) => s.terminalId.isNotNull()).all();
  return terminals.map((t) => {
    const s = open.find((x) => x.terminalId === t.id);
    return { id: t.id, name: t.name, boxId: t.boxId, warehouseId: t.warehouseId, openTurn: s ? { sessionId: s.id, cashierId: s.openedById, openedAt: String(s.openedAt), openingAmount: toNumber(s.openingAmount) } : null };
  });
}

/** El turno abierto de este cajero (en cualquier terminal), si tiene. */
export async function myTurn(tenantId: string, userId: string): Promise<{ sessionId: string; terminalId: string; terminalName: string; openedAt: string; openingAmount: number } | null> {
  const s = await db.orm.public.CashSession.where({ tenantId, openedById: userId }).where((s) => s.closedAt.isNull()).where((s) => s.terminalId.isNotNull()).first();
  if (!s?.terminalId) return null;
  const t = await db.orm.public.PosTerminal.where({ tenantId, id: s.terminalId }).select("name").first();
  return { sessionId: s.id, terminalId: s.terminalId, terminalName: t?.name ?? "Terminal", openedAt: String(s.openedAt), openingAmount: toNumber(s.openingAmount) };
}

/**
 * Abre un turno de caja en una terminal. Falla si la terminal no existe, el valor de apertura es negativo o la persona ya tiene un turno abierto.
 */
export async function openTurn(tenantId: string, terminalId: string, openingAmount: number, userId: string): Promise<{ ok: true; sessionId: string } | { ok: false; message: string }> {
  const t = await db.orm.public.PosTerminal.where({ tenantId, id: terminalId, active: true }).first();
  if (!t) return { ok: false, message: "La terminal no existe." };
  if (!(openingAmount >= 0)) return { ok: false, message: "El valor de apertura no puede ser negativo." };
  if (await myTurn(tenantId, userId)) return { ok: false, message: "Ya tienes un turno abierto. Ciérralo antes de abrir otro." };
  const r = await openCashSession(tenantId, t.boxId, openingAmount, userId);
  if (!r.ok) return { ok: false, message: "La terminal ya tiene un turno abierto por otra persona." };
  await db.orm.public.CashSession.where({ tenantId, id: r.id }).update({ terminalId });
  return { ok: true, sessionId: r.id };
}

/** Cierra el turno con arqueo: solo quien lo abrió (o quien administra, `force`). */
export async function closeTurn(tenantId: string, sessionId: string, counted: number, notes: string | null, userId: string, force = false) {
  const s = await db.orm.public.CashSession.where({ tenantId, id: sessionId }).first();
  if (!s || s.closedAt || !s.terminalId) return { ok: false as const, message: "El turno no está abierto." };
  if (s.openedById !== userId && !force) return { ok: false as const, message: "Solo quien abrió el turno puede cerrarlo." };
  if (!(counted >= 0)) return { ok: false as const, message: "El efectivo contado no puede ser negativo." };
  const r = await closeCashSession(tenantId, sessionId, counted, notes, userId);
  return r.ok ? { ok: true as const, expected: r.expected, difference: Math.round((counted - r.expected) * 100) / 100 } : r;
}

/** `note` y `unitPrice` solo valen en productos marcados como personalizables (renglón a medida); en los demás el servidor los ignora. */
export type CartLineInput = { productId: string; quantity: number; discountPct?: number; note?: string; unitPrice?: number };
export type SaleInput = { lines: CartLineInput[]; tip?: { pct?: number; fixed?: number }; payments: PaymentInput[]; customerId?: string | null; /** Identificador de la venta que pone el dispositivo: enviarla dos veces (p. ej. al volver la conexión) no la registra dos veces. */ clientSaleId?: string };

export const isClientSaleId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v);

/** La venta ya registrada con ese identificador del dispositivo (la guarda el primer pago), o `null`. */
export async function existingSale(tenantId: string, clientSaleId: string): Promise<Extract<SaleResult, { ok: true }> | null> {
  const pay = await db.orm.public.Payment.where({ tenantId, providerRefId: `pos:${clientSaleId}:0` }).select("sourceId").first();
  const doc = pay?.sourceId ? await db.orm.public.Invoice.where({ tenantId, id: pay.sourceId, kind: "SALE" }).select("id", "number", "prefix", "total", "tipTotal").first() : null;
  return doc ? { ok: true, documentId: doc.id, number: doc.number, code: saleCode(doc.prefix, doc.number), total: toNumber(doc.total), tip: toNumber(doc.tipTotal), change: 0, receipts: [] } : null;
}
export type SaleResult = { ok: true; documentId: string; number: number; /** Número tal como sale en el tiquete: con el prefijo de la resolución de numeración si el negocio la tiene. */ code?: string; total: number; tip: number; change: number; receipts: string[] } | { ok: false; message: string };

/** Descuento máximo que un cajero puede dar por su cuenta en una línea. */
export const MAX_CASHIER_DISCOUNT = 30;

/** Número de la venta como sale impreso: con la serie de la resolución («POS-000042») o, sin ella, «V-000042». */
export function saleCode(prefix: string | null | undefined, number: number): string {
  const n = String(number).padStart(6, "0");
  return prefix ? `${prefix.replace(/-$/, "")}-${n}` : `V-${n}`;
}

/**
 * Cobra un carrito en el turno abierto de quien vende: valida descuentos (los altos requieren autorización), crea el documento de venta, registra cada pago en caja y descuenta el inventario, todo en una sola transacción del servicio de dinero.
 */
export async function sellCart(tenantId: string, input: SaleInput, userId: string, opts: { canDiscountOver?: boolean } = {}): Promise<SaleResult> {
  if (!input.lines.length) return { ok: false, message: "Agrega al menos un producto." };
  if (input.clientSaleId !== undefined && !isClientSaleId(input.clientSaleId)) return { ok: false, message: "Identificador de venta inválido." };
  if (input.clientSaleId) {
    const again = await existingSale(tenantId, input.clientSaleId);
    if (again) return again;
  }
  try {
    return await moneyTransaction(async (tx) => {
      const turn = await tx.orm.public.CashSession.where({ tenantId, openedById: userId }).where((s) => s.closedAt.isNull()).where((s) => s.terminalId.isNotNull()).first();
      if (!turn?.terminalId) throw new MoneyError("Abre tu turno para vender.");
      const terminal = await tx.orm.public.PosTerminal.where({ tenantId, id: turn.terminalId }).first();
      if (!terminal) throw new MoneyError("La terminal ya no existe.");

      const ids = [...new Set(input.lines.map((l) => l.productId))];
      const products = await tx.orm.public.Product.where({ tenantId }).where((p) => p.id.in(ids)).all();
      const byId = new Map(products.map((p) => [p.id, p]));
      // Lista de precios de quien compra (la suya, la de su grupo o la predeterminada): el precio y los escalones por cantidad salen de la base.
      const listId = await priceListFor(tenantId, input.customerId);
      const pricing = await pricingFor(tenantId, listId, ids);
      const docLines = input.lines.map((l) => {
        const p = byId.get(l.productId);
        if (!p || !p.active) throw new MoneyError("Un producto del carrito ya no está disponible.");
        if (!(l.quantity > 0)) throw new MoneyError(`Cantidad inválida en «${p.name}».`);
        const discountPct = l.discountPct ?? 0;
        if (!(discountPct >= 0 && discountPct <= 100)) throw new MoneyError(`Descuento inválido en «${p.name}».`);
        if (discountPct > MAX_CASHIER_DISCOUNT && !opts.canDiscountOver) throw new MoneyError(`Un descuento mayor a ${MAX_CASHIER_DISCOUNT} % lo autoriza el dueño o administración.`);
        // Renglón a medida: nota y precio acordado, solo si el producto es personalizable (si no, el precio es el de la base).
        const custom = p.customizable;
        if (custom && l.unitPrice != null && !(Number.isFinite(l.unitPrice) && l.unitPrice >= 0)) throw new MoneyError(`Precio inválido en «${p.name}».`);
        return { description: lineDescription(p.name, custom ? l.note : null), quantity: l.quantity, unitPrice: custom && l.unitPrice != null ? l.unitPrice : tierPrice(toNumber(p.price), pricing[p.id]?.list, pricing[p.id]?.tiers, l.quantity), productId: p.id, discountPct, taxRatePct: p.taxCategory === "GRAVADO" ? toNumber(p.taxRatePct) : 0 };
      });
      const totals = cartTotals(docLines);
      const tip = tipFor(input.tip ?? {}, totals);
      const settled = settlePayments(totals.total + tip, input.payments);
      if ("error" in settled) throw new MoneyError(settled.error);
      // Parte a crédito (fiado): la persona debe quedar identificada; lo que debe pasa a su cartera como cuenta de cobro.
      const credit = Math.round(settled.applied.filter((p) => p.method === "CREDIT").reduce((s, p) => s + p.amount, 0) * 100) / 100;
      const customer = credit > 0 ? await tx.orm.public.Customer.where({ tenantId, id: input.customerId ?? "" }).select("id", "name").first() : null;
      if (credit > 0 && !customer) throw new MoneyError("Para vender a crédito elige el cliente.");

      const doc = await insertDocument(tx, tenantId, { kind: "SALE", status: "PAID", customerId: input.customerId ?? null, customerName: "Cliente de mostrador", originType: "POS", originId: terminal.id, tipTotal: tip, lines: docLines }, userId);
      const receipts: string[] = [];
      let firstPayment: string | null = null;
      let paymentIndex = 0;
      for (const pay of settled.applied) {
        if (pay.method === "CREDIT") continue;
        const income = await recordIncome(tx, tenantId, { amount: pay.amount, method: pay.method, notes: pay.label ?? null, providerRefId: input.clientSaleId ? `pos:${input.clientSaleId}:${paymentIndex++}` : null, customerId: input.customerId ?? null, description: `Venta POS ${terminal.name}`, cashDescription: `Venta POS ${terminal.name}`, sourceType: "POS", sourceId: doc.id, cashSessionId: turn.id, skipDocument: true }, userId);
        receipts.push(income.receipt);
        firstPayment ??= income.paymentId;
      }
      if (firstPayment) await tx.orm.public.Invoice.where({ tenantId, id: doc.id }).update({ paymentId: firstPayment });
      if (credit > 0 && customer) {
        const due = Temporal.Instant.fromEpochMilliseconds(Date.now() + 30 * 86_400_000);
        await insertDocument(tx, tenantId, { kind: "BILL", status: "ISSUED", customerId: customer.id, customerName: customer.name, dueDate: due, sourceDocumentId: doc.id, originType: "POS", originId: doc.id, notes: `Venta a crédito en el punto de venta (venta ${saleCode(doc.prefix, doc.number)})`, lines: [{ description: `Venta a crédito ${saleCode(doc.prefix, doc.number)}`, quantity: 1, unitPrice: credit, taxRatePct: 0 }] }, userId);
      }

      for (const l of docLines) {
        const p = byId.get(l.productId!)!;
        if (!p.trackStock) continue;
        try {
          await applyStockMovement(tx, tenantId, { productId: p.id, kind: "SALE", quantity: l.quantity, warehouseId: terminal.warehouseId ?? undefined, note: `Venta POS N.º ${doc.number}`, userId, documentType: "SALE", documentId: doc.id });
        } catch (e) {
          if (e instanceof StockError) throw new MoneyError(e.message);
          throw e;
        }
      }
      await emitEvent(tx, tenantId, { type: "sale.completed", resourceType: "document", resourceId: doc.id, payload: { document_id: doc.id, total: totals.total, tip, currency: "COP", terminal_id: terminal.id, payments: settled.applied } });
      return { ok: true as const, documentId: doc.id, number: doc.number, code: saleCode(doc.prefix, doc.number), total: totals.total, tip, change: settled.change, receipts };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false, message: e.message };
    // Dos envíos a la vez de la misma venta: gana el primero y el otro devuelve esa venta.
    if (input.clientSaleId && /providerRefId|Payment_.*key|unique|duplicate/i.test(String((e as Error)?.message ?? e))) {
      const again = await existingSale(tenantId, input.clientSaleId);
      if (again) return again;
    }
    throw e;
  }
}

/** Datos del tiquete de una venta POS del negocio (o `null` si no es de este negocio). */
export async function receiptOf(tenantId: string, documentId: string): Promise<import("./receipt").ReceiptData | null> {
  const doc = await db.orm.public.Invoice.where({ tenantId, id: documentId, kind: "SALE" }).first();
  if (!doc) return null;
  const [lines, pays, shop] = await Promise.all([
    db.orm.public.InvoiceLine.where({ invoiceId: doc.id }).all(),
    db.orm.public.Payment.where({ tenantId, sourceType: "POS", sourceId: doc.id }).all(),
    db.orm.public.Tenant.where({ id: tenantId }).select("name", "taxId").first(),
  ]);
  const subtotal = toNumber(doc.subtotal);
  const discountTotal = toNumber(doc.discountTotal);
  const paid = pays.reduce((s, p) => s + toNumber(p.amount), 0);
  const total = toNumber(doc.total);
  const tip = toNumber(doc.tipTotal);
  return {
    business: shop?.name ?? "Mi negocio",
    taxId: shop?.taxId ?? null,
    code: saleCode(doc.prefix, doc.number),
    date: String(doc.issueDate).slice(0, 16).replace("T", " "),
    lines: lines.map((l) => ({ description: l.description, quantity: toNumber(l.quantity), unitPrice: toNumber(l.unitPrice), discountPct: toNumber(l.discountPct) || undefined, total: toNumber(l.total) })),
    subtotal,
    discountTotal,
    taxTotal: toNumber(doc.taxTotal),
    total,
    tip,
    payments: pays.map((p) => ({ method: String(p.provider), amount: toNumber(p.amount) })),
    change: Math.max(0, Math.round((paid - total - tip) * 100) / 100),
    credit: Math.max(0, Math.round((total + tip - paid) * 100) / 100),
  };
}
