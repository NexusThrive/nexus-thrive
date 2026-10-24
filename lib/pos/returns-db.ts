import { insertDocument } from "@/lib/business/documents-db";
import { MoneyError, moneyTransaction } from "@/lib/business/money-service";
import { toNumber } from "@/lib/format";
import { emitEvent } from "@/lib/events/outbox";
import { applyStockMovement } from "@/lib/inventory/stock-service";
import { db } from "@/prisma/db";

/**
 * Devoluciones del punto de venta (servidor): una nota crédito parcial o total sobre una
 * venta, con el reingreso de las unidades a la bodega y su costo original, y el reembolso
 * (en efectivo sale de la caja del turno; los demás medios quedan anotados). Todo en una
 * transacción y solo dentro del negocio de la venta.
 */
export type SaleLine = { productId: string; description: string; sold: number; returned: number; remaining: number; unitPrice: number; discountPct: number; taxRatePct: number };
export type SaleToReturn = { documentId: string; number: number; total: number; issuedAt: string; lines: SaleLine[] };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** La venta POS por su número, con lo vendido, lo ya devuelto y lo que queda por devolver. */
export async function saleForReturn(tenantId: string, number: number): Promise<SaleToReturn | null> {
  const sale = await db.orm.public.Invoice.where({ tenantId, kind: "SALE", number }).first();
  if (!sale || sale.status === "VOID") return null;
  const lines = await db.orm.public.InvoiceLine.where({ invoiceId: sale.id }).all();
  const notes = await db.orm.public.Invoice.where({ tenantId, kind: "CREDIT_NOTE", sourceDocumentId: sale.id }).all();
  const noteLines = notes.length ? await db.orm.public.InvoiceLine.where((l) => l.invoiceId.in(notes.map((n) => n.id))).all() : [];
  const returnedBy = new Map<string, number>();
  for (const l of noteLines) if (l.productId) returnedBy.set(l.productId, (returnedBy.get(l.productId) ?? 0) + toNumber(l.quantity));
  return {
    documentId: sale.id,
    number: sale.number,
    total: toNumber(sale.total),
    issuedAt: String(sale.issueDate),
    lines: lines.filter((l) => l.productId).map((l) => {
      const sold = toNumber(l.quantity);
      const returned = returnedBy.get(l.productId!) ?? 0;
      return { productId: l.productId!, description: l.description, sold, returned, remaining: Math.max(0, sold - returned), unitPrice: toNumber(l.unitPrice), discountPct: toNumber(l.discountPct), taxRatePct: toNumber(l.taxRatePct) };
    }),
  };
}

export type ReturnInput = { documentId: string; lines: { productId: string; quantity: number }[]; reason: string; refundMethod: string };
export type ReturnResult = { ok: true; noteNumber: number; refund: number } | { ok: false; message: string };

export async function returnSale(tenantId: string, input: ReturnInput, userId: string): Promise<ReturnResult> {
  const wanted = input.lines.filter((l) => l.quantity > 0);
  if (!wanted.length) return { ok: false, message: "Elige qué se devuelve." };
  if (input.reason.trim().length < 3) return { ok: false, message: "Escribe el motivo de la devolución." };
  try {
    return await moneyTransaction(async (tx) => {
      const sale = await tx.orm.public.Invoice.where({ tenantId, id: input.documentId, kind: "SALE" }).first();
      if (!sale || sale.status === "VOID") throw new MoneyError("La venta no existe o está anulada.");
      const soldLines = await tx.orm.public.InvoiceLine.where({ invoiceId: sale.id }).all();
      const notes = await tx.orm.public.Invoice.where({ tenantId, kind: "CREDIT_NOTE", sourceDocumentId: sale.id }).all();
      const prior = notes.length ? await tx.orm.public.InvoiceLine.where((l) => l.invoiceId.in(notes.map((n) => n.id))).all() : [];
      const noteLines: { description: string; quantity: number; unitPrice: number; discountPct: number; taxRatePct: number; productId: string }[] = [];
      for (const w of wanted) {
        const line = soldLines.find((l) => l.productId === w.productId);
        if (!line) throw new MoneyError("Una línea no pertenece a esa venta.");
        const already = prior.filter((p) => p.productId === w.productId).reduce((s, p) => s + toNumber(p.quantity), 0);
        const remaining = toNumber(line.quantity) - already;
        if (w.quantity > remaining) throw new MoneyError(`De «${line.description}» solo se pueden devolver ${remaining}.`);
        noteLines.push({ description: line.description, quantity: w.quantity, unitPrice: toNumber(line.unitPrice), discountPct: toNumber(line.discountPct), taxRatePct: toNumber(line.taxRatePct), productId: w.productId });
      }
      const refundCash = input.refundMethod === "CASH";
      const turn = refundCash ? await tx.orm.public.CashSession.where({ tenantId, openedById: userId }).where((s) => s.closedAt.isNull()).first() : null;
      if (refundCash && !turn) throw new MoneyError("Abre tu turno para devolver efectivo.");

      const note = await insertDocument(tx, tenantId, { kind: "CREDIT_NOTE", customerId: sale.customerId, customerName: sale.customerName, status: "ISSUED", notes: input.reason.trim().slice(0, 200), sourceDocumentId: sale.id, originType: "RETURN", originId: sale.id, lines: noteLines }, userId);
      // Las unidades vuelven a la bodega de la que salieron y al costo con que salieron.
      for (const l of noteLines) {
        const mov = await tx.orm.public.StockMovement.where({ tenantId, documentId: sale.id, productId: l.productId, kind: "SALE" }).first();
        if (!mov) continue; // producto sin control de existencias
        await applyStockMovement(tx, tenantId, { productId: l.productId, kind: "IN", quantity: l.quantity, unitCost: mov.unitCost == null ? null : toNumber(mov.unitCost), warehouseId: mov.warehouseId, note: `Devolución de la venta N.º ${sale.number}`, userId, documentType: "CREDIT_NOTE", documentId: note.id });
      }
      const refund = round2(note.total);
      if (turn) {
        await tx.orm.public.CashMovement.create({ tenantId, sessionId: turn.id, kind: "EXPENSE", amount: refund.toFixed(2), description: `Devolución venta N.º ${sale.number}`, beneficiary: null, paymentId: null, expenseId: null, createdById: userId });
      }
      await emitEvent(tx, tenantId, { type: "sale.returned", resourceType: "document", resourceId: note.id, payload: { credit_note_id: note.id, sale_id: sale.id, refund, method: input.refundMethod, reason: input.reason.trim().slice(0, 200), currency: "COP" } });
      return { ok: true as const, noteNumber: note.number, refund };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false, message: e.message };
    throw e;
  }
}
