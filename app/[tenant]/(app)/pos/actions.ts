"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/core/auth/permissions";
import { priceListFor, pricingFor, type ListPricing } from "@/lib/business/catalog/pricing-db";
import { offeredPaymentMethods } from "@/lib/business/sales/payment-methods-db";
import { PAYMENT_METHODS } from "@/lib/foundation/kernel/payment-vocabulary";
import { findByBarcode } from "@/lib/business/catalog/catalog-db";
import { returnSale, saleForReturn, type ReturnInput, type SaleToReturn } from "@/lib/business/pos/returns-db";
import { closeTurn, createTerminal, openTurn, sellCart, type SaleInput, type SaleResult } from "@/lib/business/pos/pos-db";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type PosResult = { ok: true; message: string } | { ok: false; message: string };
const cashier = async (slug: string) => {
  const ctx = await requireTenantContext(slug, "/pos");
  return ctx && can(ctx.role, "money.handle") ? ctx : null;
};
const refresh = (slug: string) => revalidatePath(`/${slug}/pos`);

export async function createTerminalAction(slug: string, name: string): Promise<PosResult> {
  const ctx = await requireTenantContext(slug, "/pos");
  if (!ctx || !can(ctx.role, "business.manage")) return { ok: false, message: "Solo el dueño o administración crea terminales." };
  const r = await createTerminal(ctx.tenantId, name, null);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Terminal creada" };
}

export async function openTurnAction(slug: string, terminalId: string, openingAmount: number): Promise<PosResult> {
  const ctx = await cashier(slug);
  if (!ctx) return { ok: false, message: "Tu rol no puede abrir turnos." };
  const r = await openTurn(ctx.tenantId, terminalId, openingAmount, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_POS_TURN", { action: "open", terminalId, openingAmount });
  refresh(slug);
  return { ok: true, message: "Turno abierto" };
}

export async function closeTurnAction(slug: string, sessionId: string, counted: number, notes: string): Promise<PosResult & { difference?: number }> {
  const ctx = await cashier(slug);
  if (!ctx) return { ok: false, message: "Tu rol no puede cerrar turnos." };
  const r = await closeTurn(ctx.tenantId, sessionId, counted, notes.trim().slice(0, 300) || null, ctx.memberId, can(ctx.role, "business.manage"));
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_POS_TURN", { action: "close", sessionId, expected: r.expected, counted, difference: r.difference });
  refresh(slug);
  const text = r.difference === 0 ? "Caja cuadrada" : r.difference > 0 ? `Sobran ${r.difference.toLocaleString("es-CO")}` : `Faltan ${Math.abs(r.difference).toLocaleString("es-CO")}`;
  return { ok: true, message: `Turno cerrado · ${text}`, difference: r.difference };
}

export async function sellAction(slug: string, input: SaleInput): Promise<SaleResult> {
  const ctx = await cashier(slug);
  if (!ctx) return { ok: false, message: "Tu rol no puede vender en el punto de venta." };
  if (input.payments.some((p) => !PAYMENT_METHODS.some((m) => m.value === p.method))) return { ok: false, message: "Elige un medio de pago válido." };
  // El medio lo define el negocio: el nombre y el tipo salen de su configuración, no de lo que mande el navegador.
  const offered = await offeredPaymentMethods(ctx.tenantId);
  const payments: SaleInput["payments"] = [];
  for (const p of input.payments) {
    if (!p.methodId) {
      payments.push({ method: p.method, amount: p.amount });
      continue;
    }
    const method = offered.find((m) => m.id === p.methodId);
    if (!method) return { ok: false, message: "Ese medio de pago ya no está disponible." };
    payments.push({ method: method.kind, amount: p.amount, methodId: method.id, label: method.kind === "CASH" && method.name === "Efectivo" ? undefined : method.name });
  }
  const r = await sellCart(ctx.tenantId, { ...input, payments }, ctx.memberId, { canDiscountOver: can(ctx.role, "business.manage") });
  if (r.ok) revalidatePath(`/${slug}/inventario/productos`);
  return r;
}

/** Escáner de código de barras: devuelve el producto para agregarlo al carrito. */
export async function scanBarcodeAction(slug: string, code: string): Promise<{ ok: true; productId: string; name: string } | { ok: false; message: string }> {
  const ctx = await cashier(slug);
  if (!ctx) return { ok: false, message: "Tu rol no puede vender en el punto de venta." };
  const hit = await findByBarcode(ctx.tenantId, code);
  if (!hit || !hit.product.active) return { ok: false, message: "No hay un producto con ese código." };
  return { ok: true, productId: hit.product.id, name: hit.product.name };
}

/** Busca una venta por su número para devolver parte o todo. */
export async function findSaleAction(slug: string, number: number): Promise<{ ok: true; sale: SaleToReturn } | { ok: false; message: string }> {
  const ctx = await cashier(slug);
  if (!ctx) return { ok: false, message: "Tu rol no maneja devoluciones." };
  const sale = Number.isInteger(number) && number > 0 ? await saleForReturn(ctx.tenantId, number) : null;
  return sale ? { ok: true, sale } : { ok: false, message: "No se encontró esa venta." };
}

export async function returnSaleAction(slug: string, input: ReturnInput): Promise<PosResult> {
  const ctx = await cashier(slug);
  if (!ctx) return { ok: false, message: "Tu rol no maneja devoluciones." };
  if (!PAYMENT_METHODS.some((m) => m.value === input.refundMethod)) return { ok: false, message: "Elige cómo se devuelve el dinero." };
  const r = await returnSale(ctx.tenantId, input, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_POS_TURN", { action: "return", documentId: input.documentId, noteNumber: r.noteNumber, refund: r.refund });
  revalidatePath(`/${slug}/inventario/productos`);
  return { ok: true, message: `Devolución registrada · nota crédito N.º ${r.noteNumber} · ${r.refund.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}` };
}

/** Precios de la lista que le toca al cliente (o la predeterminada): precio de lista y escalones por cantidad por producto. */
export async function posPricingAction(slug: string, customerId: string | null): Promise<{ ok: true; listId: string | null; pricing: Record<string, ListPricing> } | { ok: false; message: string }> {
  const ctx = await cashier(slug);
  if (!ctx) return { ok: false, message: "Tu rol no puede vender en el punto de venta." };
  const listId = await priceListFor(ctx.tenantId, customerId);
  return { ok: true, listId, pricing: await pricingFor(ctx.tenantId, listId) };
}
