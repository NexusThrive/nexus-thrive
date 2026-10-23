"use server";

import { revalidatePath } from "next/cache";
import { parseMuseumSettings } from "@/lib/business/museum";
import { createTicketSale, payTicketSale, saveMuseumSettings, seedTicketTypes, voidTicketSale, type NewSale } from "@/lib/business/museum-db";
import { canHandleCash, canManage } from "@/lib/business/roles";
import { PAYMENT_METHODS } from "@/lib/finance";
import { requireTenantContext } from "@/lib/tenant/context";

export type TicketResult = { ok: true; message?: string } | { ok: false; message: string };
const DENIED: TicketResult = { ok: false, message: "Tu rol no permite esta acción." };
const validMethod = (m: string) => PAYMENT_METHODS.some((x) => x.value === m);

function refresh(slug: string) {
  revalidatePath(`/${slug}/tickets`);
  revalidatePath(`/${slug}/bookings`);
  revalidatePath(`/${slug}/finance`);
  revalidatePath(`/${slug}`);
}

export async function sellTicketsAction(slug: string, input: NewSale): Promise<TicketResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx || !canHandleCash(ctx.role)) return DENIED;
  if (input.pay && !validMethod(input.pay.method)) return { ok: false, message: "Elige el medio de pago." };
  const r = await createTicketSale(ctx.tenantId, input, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: r.receipt ? `Venta ${r.code} · recibo ${r.receipt}` : `Reserva ${r.code} registrada` };
}

export async function payTicketsAction(slug: string, id: string, method: string): Promise<TicketResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx || !canHandleCash(ctx.role)) return DENIED;
  if (!validMethod(method)) return { ok: false, message: "Elige el medio de pago." };
  const r = await payTicketSale(ctx.tenantId, id, method, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: `Cobrada · recibo ${r.receipt}` };
}

export async function voidTicketsAction(slug: string, id: string, reason: string): Promise<TicketResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx || !canManage(ctx.role)) return { ok: false, message: "Solo el dueño o administración anulan ventas." };
  if (reason.trim().length < 3) return { ok: false, message: "Escribe el motivo." };
  const r = await voidTicketSale(ctx.tenantId, id, reason.trim(), ctx.memberId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Venta anulada: el cupo quedó libre." };
}

export async function saveMuseumSettingsAction(slug: string, input: { capacityPerSlot: number; slots: string; closedWeekdays: number[]; guidedMinutes: number }): Promise<TicketResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx || !canManage(ctx.role)) return DENIED;
  const v = parseMuseumSettings(input);
  if (!v.ok) return v;
  await saveMuseumSettings(ctx.tenantId, v.value);
  refresh(slug);
  return { ok: true, message: "Ajustes de taquilla guardados" };
}

export async function seedTicketTypesAction(slug: string): Promise<TicketResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx || !canManage(ctx.role)) return DENIED;
  const created = await seedTicketTypes(ctx.tenantId);
  revalidatePath(`/${slug}/tickets`);
  revalidatePath(`/${slug}/inventory`);
  return created ? { ok: true, message: "Entradas creadas: ajusta los precios en Catálogo." } : { ok: false, message: "Ya tienes tipos de entrada." };
}
