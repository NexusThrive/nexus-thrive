"use server";

import { revalidatePath } from "next/cache";
import { receiveInvoicePayment } from "@/lib/business/sales/money-service";
import { can } from "@/lib/core/auth/permissions";
import { paySupplierInvoice } from "@/lib/domains/finance/receivables/receivables-db";
import { offeredPaymentMethods } from "@/lib/business/sales/payment-methods-db";
import { PAYMENT_METHODS } from "@/lib/foundation/kernel/payment-vocabulary";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type CarteraResult = { ok: true; message: string } | { ok: false; message: string };
const methodOk = (m: string) => PAYMENT_METHODS.some((x) => x.value === m);
const refresh = (slug: string) => revalidatePath(`/${slug}/finanzas/cartera`);
const peso = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

/** Abono a una cuenta por cobrar: lo hace quien maneja dinero. */
export async function receivePaymentAction(slug: string, invoiceId: string, input: { amount: number; method: string; methodId?: string }): Promise<CarteraResult> {
  const ctx = await requireTenantContext(slug, "/finanzas/cartera");
  if (!ctx || !can(ctx.role, "money.handle")) return { ok: false, message: "Tu rol no puede registrar cobros." };
  // Con un medio del negocio, el tipo y el nombre salen de su configuración (un cobro de cartera no puede ser «a crédito»).
  let method = input.method;
  let methodName: string | null = null;
  if (input.methodId) {
    const chosen = (await offeredPaymentMethods(ctx.tenantId)).find((m) => m.id === input.methodId && m.kind !== "CREDIT");
    if (!chosen) return { ok: false, message: "Ese medio de pago ya no está disponible." };
    method = chosen.kind;
    methodName = chosen.name;
  } else if (!methodOk(method)) return { ok: false, message: "Elige el medio de pago." };
  const r = await receiveInvoicePayment(ctx.tenantId, invoiceId, input.amount, method, ctx.memberId, methodName);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_CARTERA_PAYMENT", { direction: "in", invoiceId, amount: input.amount, settled: r.settled });
  refresh(slug);
  return { ok: true, message: r.settled ? `Cuenta saldada · ${r.receipt}` : `Abono registrado · ${r.receipt}. Saldo ${peso(r.balance)}` };
}

/** Pago a un proveedor: dinero que sale, solo dueño y administración. */
export async function paySupplierAction(slug: string, supplierInvoiceId: string, input: { amount: number; method: string; note: string }): Promise<CarteraResult> {
  const ctx = await requireTenantContext(slug, "/finanzas/cartera");
  if (!ctx || !can(ctx.role, "business.manage")) return { ok: false, message: "Solo el dueño o administración paga a proveedores." };
  if (!methodOk(input.method)) return { ok: false, message: "Elige el medio de pago." };
  const r = await paySupplierInvoice(ctx.tenantId, supplierInvoiceId, input, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_CARTERA_PAYMENT", { direction: "out", supplierInvoiceId, amount: input.amount, settled: r.settled });
  refresh(slug);
  return { ok: true, message: r.settled ? "Factura pagada por completo" : `Pago registrado. Saldo ${peso(r.balance)}` };
}
