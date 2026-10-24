"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/business/permissions";
import { PAYMENT_METHODS } from "@/lib/finance";
import { closeTurn, createTerminal, openTurn, sellCart, type SaleInput, type SaleResult } from "@/lib/pos/pos-db";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

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
  const r = await sellCart(ctx.tenantId, input, ctx.memberId, { canDiscountOver: can(ctx.role, "business.manage") });
  if (r.ok) revalidatePath(`/${slug}/inventory`);
  return r;
}
