"use server";

import { revalidatePath } from "next/cache";
import { receiveInvoicePayment } from "@/lib/business/money-service";
import { can } from "@/lib/business/permissions";
import { paySupplierInvoice } from "@/lib/receivables/receivables-db";
import { PAYMENT_METHODS } from "@/lib/finance";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type CarteraResult = { ok: true; message: string } | { ok: false; message: string };
const methodOk = (m: string) => PAYMENT_METHODS.some((x) => x.value === m);
const refresh = (slug: string) => revalidatePath(`/${slug}/cartera`);
const peso = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** Abono a una cuenta por cobrar: lo hace quien maneja dinero. */
export async function receivePaymentAction(slug: string, invoiceId: string, input: { amount: number; method: string }): Promise<CarteraResult> {
  const ctx = await requireTenantContext(slug, "/cartera");
  if (!ctx || !can(ctx.role, "money.handle")) return { ok: false, message: "Tu rol no puede registrar cobros." };
  if (!methodOk(input.method)) return { ok: false, message: "Elige el medio de pago." };
  const r = await receiveInvoicePayment(ctx.tenantId, invoiceId, input.amount, input.method, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_CARTERA_PAYMENT", { direction: "in", invoiceId, amount: input.amount, settled: r.settled });
  refresh(slug);
  return { ok: true, message: r.settled ? `Cuenta saldada · ${r.receipt}` : `Abono registrado · ${r.receipt}. Saldo ${peso(r.balance)}` };
}

/** Pago a un proveedor: dinero que sale, solo dueño y administración. */
export async function paySupplierAction(slug: string, supplierInvoiceId: string, input: { amount: number; method: string; note: string }): Promise<CarteraResult> {
  const ctx = await requireTenantContext(slug, "/cartera");
  if (!ctx || !can(ctx.role, "business.manage")) return { ok: false, message: "Solo el dueño o administración paga a proveedores." };
  if (!methodOk(input.method)) return { ok: false, message: "Elige el medio de pago." };
  const r = await paySupplierInvoice(ctx.tenantId, supplierInvoiceId, input, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_CARTERA_PAYMENT", { direction: "out", supplierInvoiceId, amount: input.amount, settled: r.settled });
  refresh(slug);
  return { ok: true, message: r.settled ? "Factura pagada por completo" : `Pago registrado. Saldo ${peso(r.balance)}` };
}
