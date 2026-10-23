import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import { invoiceTotal, lineTotal, type InvoiceKind, type LineInput } from "./invoice";

/** Recibos y cuentas de cobro del negocio (servidor). */

const dec = (n: number) => n.toFixed(2);
const at = (d: string) => Temporal.Instant.from(`${d}T12:00:00Z`);
const day = (v: unknown) => (v ? String(v).slice(0, 10) : null);

export type InvoiceRow = {
  id: string;
  kind: InvoiceKind;
  number: number;
  customerId: string | null;
  customerName: string;
  customerDoc: string | null;
  issueDate: string;
  dueDate: string | null;
  status: "ISSUED" | "PAID" | "VOID";
  notes: string | null;
  total: number;
  voidReason: string | null;
  lines: { id: string; description: string; quantity: number; unitPrice: number; total: number }[];
};

export async function listInvoices(tenantId: string): Promise<InvoiceRow[]> {
  const rows = await db.orm.public.Invoice.where({ tenantId }).include("lines").orderBy((i) => i.createdAt.desc()).limit(200).all();
  return rows.map((i) => ({
    id: i.id,
    kind: i.kind as InvoiceKind,
    number: i.number,
    customerId: i.customerId,
    customerName: i.customerName,
    customerDoc: i.customerDoc,
    issueDate: day(i.issueDate)!,
    dueDate: day(i.dueDate),
    status: i.status as InvoiceRow["status"],
    notes: i.notes,
    total: toNumber(i.total),
    voidReason: i.voidReason,
    lines: i.lines.map((l) => ({ id: l.id, description: l.description, quantity: toNumber(l.quantity), unitPrice: toNumber(l.unitPrice), total: toNumber(l.total) })),
  }));
}

/** Estado de un documento del negocio (antes de anularlo). */
export async function invoiceStatus(tenantId: string, id: string): Promise<string | null> {
  const row = await db.orm.public.Invoice.where({ tenantId, id }).select("status").first();
  return row ? String(row.status) : null;
}

export async function getInvoice(tenantId: string, id: string) {
  return (await listInvoices(tenantId)).find((i) => i.id === id) ?? null;
}

export async function createInvoice(tenantId: string, v: { kind: InvoiceKind; customerId: string | null; customerName: string; customerDoc: string | null; issueDate: string; dueDate: string | null; notes: string | null; lines: LineInput[] }, userId: string) {
  const total = invoiceTotal(v.lines);
  for (let attempt = 0; attempt < 6; attempt++) {
    const { top } = await db.orm.public.Invoice.where({ tenantId, kind: v.kind }).aggregate((a) => ({ top: a.max("number") }));
    const number = (top ?? 0) + 1;
    try {
      return await db.transaction(async (tx) => {
        const inv = await tx.orm.public.Invoice.create({
          tenantId,
          kind: v.kind,
          number,
          customerId: v.customerId,
          customerName: v.customerName,
          customerDoc: v.customerDoc,
          issueDate: at(v.issueDate),
          dueDate: v.dueDate ? at(v.dueDate) : null,
          notes: v.notes,
          total: dec(total),
          createdById: userId,
        });
        for (const l of v.lines) {
          await tx.orm.public.InvoiceLine.create({ invoiceId: inv.id, productId: l.productId ?? null, description: l.description, quantity: dec(l.quantity), unitPrice: dec(l.unitPrice), total: dec(lineTotal(l)) });
        }
        return { id: inv.id, number };
      });
    } catch (e) {
      if (attempt === 5 || !/unique|duplicate/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  }
  throw new Error("No se pudo numerar.");
}

/**
 * Marca la cuenta como pagada creando el cobro (con recibo y caja si es
 * efectivo), una sola vez y en una transacción: ver `lib/business/money-service.ts`.
 */
export { payInvoice } from "./money-service";

export async function voidInvoice(tenantId: string, id: string, reason: string) {
  await db.orm.public.Invoice.where({ tenantId, id }).update({ status: "VOID", voidReason: reason });
}
