"use server";

import { revalidatePath } from "next/cache";
import { customerNameIn } from "@/lib/business/customers-db";
import { validateLines, type InvoiceKind, type LineInput } from "@/lib/business/invoice";
import { documentView, issueAdjustmentNote, type DocumentView } from "@/lib/business/documents-db";
import { createInvoice, payInvoice, voidInvoice, invoiceStatus } from "@/lib/business/invoices-db";
import { MoneyError } from "@/lib/business/money-error";
import { canHandleCash, canManage } from "@/lib/business/roles";
import { receiptCode } from "@/lib/business/invoice";
import { PAYMENT_METHODS } from "@/lib/finance";
import { requireTenantContext } from "@/lib/tenant/context";
import { logTenantAction } from "@/lib/tenant/audit";

export type BillingResult = { ok: true; message?: string; id?: string } | { ok: false; message: string };
const DENIED: BillingResult = { ok: false, message: "Tu rol no permite esta acción." };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh(slug: string) {
  revalidatePath(`/${slug}/billing`);
  revalidatePath(`/${slug}/finance`);
}

export async function createInvoiceAction(slug: string, input: { kind: string; customerId: string; customerName: string; customerDoc: string; issueDate: string; dueDate: string; notes: string; lines: LineInput[] }): Promise<BillingResult> {
  const ctx = await requireTenantContext(slug, "/billing");
  if (!ctx || !canHandleCash(ctx.role)) return DENIED;
  const kind: InvoiceKind = input.kind === "BILL" ? "BILL" : "RECEIPT";
  const lines = input.lines.map((l) => ({ description: l.description.trim().slice(0, 200), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), productId: l.productId || null }));
  const err = validateLines(lines);
  if (err) return { ok: false, message: err };
  let customerName = input.customerName.trim();
  let customerDoc = input.customerDoc.trim() || null;
  const customerId = input.customerId || null;
  if (customerId) {
    const name = await customerNameIn(ctx.tenantId, customerId);
    if (name === null) return { ok: false, message: "El cliente no es de este negocio." };
    customerName ||= name;
  }
  if (customerName.length < 2) return { ok: false, message: "Indica a quién va dirigido." };
  if (!DATE.test(input.issueDate)) return { ok: false, message: "Fecha de emisión no válida." };
  if (input.dueDate && (!DATE.test(input.dueDate) || input.dueDate < input.issueDate)) return { ok: false, message: "El vencimiento debe ser igual o posterior a la emisión." };
  customerDoc = customerDoc?.slice(0, 40) ?? null;
  const r = await createInvoice(ctx.tenantId, { kind, customerId, customerName: customerName.slice(0, 120), customerDoc, issueDate: input.issueDate, dueDate: input.dueDate || null, notes: input.notes.trim().slice(0, 500) || null, lines }, ctx.memberId);
  refresh(slug);
  return { ok: true, id: r.id, message: `${kind === "BILL" ? "Cuenta de cobro" : "Recibo"} N.º ${r.number} creado` };
}

export async function payInvoiceAction(slug: string, id: string, method: string): Promise<BillingResult> {
  const ctx = await requireTenantContext(slug, "/billing");
  if (!ctx || !canHandleCash(ctx.role)) return DENIED;
  if (!PAYMENT_METHODS.some((m) => m.value === method)) return { ok: false, message: "Elige el medio de pago." };
  const r = await payInvoice(ctx.tenantId, id, method, ctx.memberId);
  if (!r) return { ok: false, message: "Solo se pagan documentos emitidos." };
  refresh(slug);
  return { ok: true, message: `Pagada · ${receiptCode(r.receiptNumber)}` };
}

export async function voidInvoiceAction(slug: string, id: string, reason: string): Promise<BillingResult> {
  const ctx = await requireTenantContext(slug, "/billing");
  if (!ctx || !canManage(ctx.role)) return DENIED;
  if (reason.trim().length < 3) return { ok: false, message: "Escribe el motivo." };
  if ((await invoiceStatus(ctx.tenantId, id)) !== "ISSUED") return { ok: false, message: "Solo se anulan documentos emitidos y sin pagar." };
  try {
    await voidInvoice(ctx.tenantId, id, reason.trim().slice(0, 300));
  } catch (error) {
    // Un mes contable cerrado (o una cuenta apagada) impide anular: se explica en vez de fallar.
    if (error instanceof MoneyError) return { ok: false, message: error.message };
    throw error;
  }
  await logTenantAction(ctx, "BIZ_INVOICE_VOID", { invoiceId: id, reason: reason.trim().slice(0, 300) });
  refresh(slug);
  return { ok: true, message: "Anulada" };
}

/** Lo que muestra el visor de pantalla completa de un documento. */
export async function viewDocumentAction(slug: string, id: string): Promise<{ ok: true; doc: DocumentView } | { ok: false; message: string }> {
  const ctx = await requireTenantContext(slug, "/billing");
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  const doc = await documentView(ctx.tenantId, id);
  return doc ? { ok: true, doc } : { ok: false, message: "No se encontró el documento." };
}

/** Nota crédito o débito sobre un documento emitido (solo dueño y administración). */
export async function issueNoteAction(slug: string, input: { documentId: string; kind: "CREDIT_NOTE" | "DEBIT_NOTE"; concept: string; amount: number; taxRatePct: number; reason: string }): Promise<BillingResult> {
  const ctx = await requireTenantContext(slug, "/billing");
  if (!ctx || !canManage(ctx.role)) return { ok: false, message: "Solo el dueño o administración emite notas crédito y débito." };
  if (input.kind !== "CREDIT_NOTE" && input.kind !== "DEBIT_NOTE") return { ok: false, message: "Tipo de nota inválido." };
  const r = await issueAdjustmentNote(ctx.tenantId, input, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_INVOICE_NOTE", { kind: input.kind, documentId: input.documentId, noteId: r.id, total: r.total });
  refresh(slug);
  return { ok: true, id: r.id, message: `${input.kind === "CREDIT_NOTE" ? "Nota crédito" : "Nota débito"} N.º ${r.number} emitida` };
}
