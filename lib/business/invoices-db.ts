import { reverseSource } from "@/lib/accounting/ledger-db";
import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import { type InvoiceKind, type LineInput } from "./invoice";
import { createDocument } from "./documents-db";

/** Recibos y cuentas de cobro del negocio (servidor). */

const at = (d: string) => Temporal.Instant.from(`${d}T12:00:00Z`);
const day = (v: unknown) => (v ? String(v).slice(0, 10) : null);

export type InvoiceRow = {
  id: string;
  kind: InvoiceKind | "CREDIT_NOTE" | "DEBIT_NOTE";
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
  // Facturación muestra cuentas de cobro, recibos y sus notas crédito y débito;
  // las ventas al cobrar salen en el informe de ventas (documents-db).
  const rows = await db.orm.public.Invoice.where({ tenantId })
    .where((i) => i.kind.in(["BILL", "RECEIPT", "CREDIT_NOTE", "DEBIT_NOTE"]))
    .include("lines").orderBy((i) => i.createdAt.desc()).limit(200).all();
  return rows.map((i) => ({
    id: i.id,
    kind: i.kind as InvoiceRow["kind"],
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

/** Cuenta de cobro o recibo emitido a mano (Facturación). Mismo documento comercial que todo lo demás. */
export async function createInvoice(tenantId: string, v: { kind: InvoiceKind; customerId: string | null; customerName: string; customerDoc: string | null; issueDate: string; dueDate: string | null; notes: string | null; lines: LineInput[] }, userId: string) {
  const { id, number } = await createDocument(
    tenantId,
    {
      kind: v.kind,
      customerId: v.customerId,
      customerName: v.customerName,
      customerDoc: v.customerDoc,
      issueDate: at(v.issueDate),
      dueDate: v.dueDate ? at(v.dueDate) : null,
      notes: v.notes,
      lines: v.lines,
    },
    userId,
  );
  return { id, number };
}

/**
 * Marca la cuenta como pagada creando el cobro (con recibo y caja si es
 * efectivo), una sola vez y en una transacción: ver `lib/business/money-service.ts`.
 */
export { payInvoice } from "./money-service";

export async function voidInvoice(tenantId: string, id: string, reason: string) {
  // Anular no borra: el asiento de la cuenta de cobro se reversa en el mismo momento (si el mes está cerrado, no se anula).
  await db.transaction(async (tx) => {
    await tx.orm.public.Invoice.where({ tenantId, id }).update({ status: "VOID", voidReason: reason });
    await reverseSource(tx, tenantId, "DOCUMENT", id, reason, null);
  });
}
