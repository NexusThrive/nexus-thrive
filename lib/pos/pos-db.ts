import { insertDocument } from "@/lib/business/documents-db";
import { closeCashSession, openCashSession } from "@/lib/business/finance-db";
import { MoneyError, moneyTransaction, recordIncome } from "@/lib/business/money-service";
import { toNumber } from "@/lib/format";
import { emitEvent } from "@/lib/events/outbox";
import { StockError, applyStockMovement } from "@/lib/inventory/stock-service";
import { db } from "@/prisma/db";
import { cartTotals, settlePayments, tipFor, type PaymentInput } from "./cart";

/**
 * Punto de venta (servidor). Una terminal tiene su caja y su bodega; cada cajero abre
 * SU turno en ella. La venta lleva varias líneas, descuentos, propina y varios pagos, y
 * escribe todo (documento, pagos, caja, stock, evento) en una sola transacción. Los
 * precios, descuentos máximos e impuestos salen de la base, nunca del navegador.
 */
export type Terminal = { id: string; name: string; boxId: string; warehouseId: string | null; openTurn: { sessionId: string; cashierId: string; openedAt: string; openingAmount: number } | null };

export async function createTerminal(tenantId: string, name: string, warehouseId: string | null): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const clean = name.trim().slice(0, 60);
  if (clean.length < 2) return { ok: false, message: "Ponle un nombre a la terminal." };
  if (warehouseId && !(await db.orm.public.Warehouse.where({ tenantId, id: warehouseId }).select("id").first())) return { ok: false, message: "La bodega no existe." };
  const box = await db.orm.public.CashBox.create({ tenantId, name: `Caja · ${clean}`, fundAmount: "0.00" });
  const t = await db.orm.public.PosTerminal.create({ tenantId, name: clean, boxId: box.id, warehouseId });
  return { ok: true, id: t.id };
}

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

export type CartLineInput = { productId: string; quantity: number; discountPct?: number };
export type SaleInput = { lines: CartLineInput[]; tip?: { pct?: number; fixed?: number }; payments: PaymentInput[]; customerId?: string | null };
export type SaleResult = { ok: true; documentId: string; number: number; total: number; tip: number; change: number; receipts: string[] } | { ok: false; message: string };

/** Descuento máximo que un cajero puede dar por su cuenta en una línea. */
export const MAX_CASHIER_DISCOUNT = 30;

export async function sellCart(tenantId: string, input: SaleInput, userId: string, opts: { canDiscountOver?: boolean } = {}): Promise<SaleResult> {
  if (!input.lines.length) return { ok: false, message: "Agrega al menos un producto." };
  try {
    return await moneyTransaction(async (tx) => {
      const turn = await tx.orm.public.CashSession.where({ tenantId, openedById: userId }).where((s) => s.closedAt.isNull()).where((s) => s.terminalId.isNotNull()).first();
      if (!turn?.terminalId) throw new MoneyError("Abre tu turno para vender.");
      const terminal = await tx.orm.public.PosTerminal.where({ tenantId, id: turn.terminalId }).first();
      if (!terminal) throw new MoneyError("La terminal ya no existe.");

      const ids = [...new Set(input.lines.map((l) => l.productId))];
      const products = await tx.orm.public.Product.where({ tenantId }).where((p) => p.id.in(ids)).all();
      const byId = new Map(products.map((p) => [p.id, p]));
      const docLines = input.lines.map((l) => {
        const p = byId.get(l.productId);
        if (!p || !p.active) throw new MoneyError("Un producto del carrito ya no está disponible.");
        if (!(l.quantity > 0)) throw new MoneyError(`Cantidad inválida en «${p.name}».`);
        const discountPct = l.discountPct ?? 0;
        if (!(discountPct >= 0 && discountPct <= 100)) throw new MoneyError(`Descuento inválido en «${p.name}».`);
        if (discountPct > MAX_CASHIER_DISCOUNT && !opts.canDiscountOver) throw new MoneyError(`Un descuento mayor a ${MAX_CASHIER_DISCOUNT} % lo autoriza el dueño o administración.`);
        return { description: p.name, quantity: l.quantity, unitPrice: toNumber(p.price), productId: p.id, discountPct, taxRatePct: p.taxCategory === "GRAVADO" ? toNumber(p.taxRatePct) : 0 };
      });
      const totals = cartTotals(docLines);
      const tip = tipFor(input.tip ?? {}, totals);
      const settled = settlePayments(totals.total + tip, input.payments);
      if ("error" in settled) throw new MoneyError(settled.error);

      const doc = await insertDocument(tx, tenantId, { kind: "SALE", status: "PAID", customerId: input.customerId ?? null, customerName: "Cliente de mostrador", originType: "POS", originId: terminal.id, tipTotal: tip, lines: docLines }, userId);
      const receipts: string[] = [];
      let firstPayment: string | null = null;
      for (const pay of settled.applied) {
        const income = await recordIncome(tx, tenantId, { amount: pay.amount, method: pay.method, customerId: input.customerId ?? null, description: `Venta POS ${terminal.name}`, cashDescription: `Venta POS ${terminal.name}`, sourceType: "POS", sourceId: doc.id, cashSessionId: turn.id, skipDocument: true }, userId);
        receipts.push(income.receipt);
        firstPayment ??= income.paymentId;
      }
      if (firstPayment) await tx.orm.public.Invoice.where({ tenantId, id: doc.id }).update({ paymentId: firstPayment });

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
      return { ok: true as const, documentId: doc.id, number: doc.number, total: totals.total, tip, change: settled.change, receipts };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false, message: e.message };
    throw e;
  }
}
