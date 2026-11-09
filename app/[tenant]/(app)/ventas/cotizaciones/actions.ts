"use server";

import { revalidatePath } from "next/cache";
import { approveSalesQuote, createSalesQuote, rejectSalesQuote, sendSalesQuote } from "@/lib/business/sales/sales-quotes-db";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type QuoteResult = { ok: true; message: string } | { ok: false; message: string };
const refresh = (slug: string) => {
  revalidatePath(`/${slug}/ventas/cotizaciones`);
  revalidatePath(`/${slug}/finanzas/cartera`);
  revalidatePath(`/${slug}/ventas/pedidos`);
};
const NO_ACCESS: QuoteResult = { ok: false, message: "No tienes acceso a este negocio." };

export async function createQuoteAction(slug: string, input: { customerId: string; title: string; depositPct: number; validUntil: string; lines: { productId: string; quantity: number; unitPrice: number }[] }): Promise<QuoteResult> {
  const ctx = await requireTenantContext(slug, "/ventas/cotizaciones");
  if (!ctx) return NO_ACCESS;
  const r = await createSalesQuote(ctx.tenantId, { ...input, validUntil: input.validUntil || null }, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: `Cotización COT-${String(r.number).padStart(4, "0")} creada` };
}

export async function sendQuoteAction(slug: string, id: string): Promise<QuoteResult> {
  const ctx = await requireTenantContext(slug, "/ventas/cotizaciones");
  if (!ctx) return NO_ACCESS;
  const r = await sendSalesQuote(ctx.tenantId, id);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Cotización marcada como enviada" };
}

export async function approveQuoteAction(slug: string, id: string): Promise<QuoteResult> {
  const ctx = await requireTenantContext(slug, "/ventas/cotizaciones");
  if (!ctx) return NO_ACCESS;
  const r = await approveSalesQuote(ctx.tenantId, id, null);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: "approve_quote", id });
  refresh(slug);
  return { ok: true, message: `Aprobada: nació el pedido con un anticipo de ${r.deposit.toLocaleString("es-CO")} pendiente` };
}

export async function rejectQuoteAction(slug: string, id: string, note: string): Promise<QuoteResult> {
  const ctx = await requireTenantContext(slug, "/ventas/cotizaciones");
  if (!ctx) return NO_ACCESS;
  const r = await rejectSalesQuote(ctx.tenantId, id, note);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Cotización rechazada" };
}
