"use server";

import { revalidatePath } from "next/cache";
import { canManage } from "@/lib/business/roles";
import { createParty, type DuplicateMatch, type PartyInput } from "@/lib/parties/parties-db";
import { cancelOrder, closeOrder, createOrder, getOrder, markOrdered, receiveOrder, type OrderDetail, type OrderInput, type ReceiveInput } from "@/lib/purchasing/purchases-db";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type PurchaseActionResult = { ok: true; message?: string; id?: string } | { ok: false; message: string };
const DENIED = { ok: false as const, message: "Solo el dueño o administración maneja las compras." };

async function manager(slug: string) {
  const ctx = await requireTenantContext(slug, "/purchases");
  return ctx && canManage(ctx.role) ? ctx : null;
}
const refresh = (slug: string) => {
  revalidatePath(`/${slug}/purchases`);
  revalidatePath(`/${slug}/inventory`);
};

export async function createOrderAction(slug: string, input: OrderInput & { markOrdered: boolean }): Promise<PurchaseActionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const created = await createOrder(ctx.tenantId, input, ctx.memberId);
  if (!created.ok) return { ok: false, message: created.message };
  if (input.markOrdered) await markOrdered(ctx.tenantId, created.id);
  await logTenantAction(ctx, "BIZ_PURCHASE_CREATE", { orderId: created.id, code: created.code, supplierPartyId: input.supplierPartyId, lines: input.lines.length });
  refresh(slug);
  return { ok: true, id: created.id, message: `Orden ${created.code} ${input.markOrdered ? "enviada al proveedor" : "guardada como borrador"}` };
}

export async function orderDetailAction(slug: string, id: string): Promise<{ ok: true; order: OrderDetail } | { ok: false; message: string }> {
  const ctx = await manager(slug);
  if (!ctx) return { ok: false, message: DENIED.message };
  const order = await getOrder(ctx.tenantId, id);
  return order ? { ok: true, order } : { ok: false, message: "No se encontró la orden." };
}

export async function markOrderedAction(slug: string, id: string): Promise<PurchaseActionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await markOrdered(ctx.tenantId, id);
  refresh(slug);
  return r.ok ? { ok: true, message: "Orden marcada como pedida" } : r;
}

export async function receiveOrderAction(slug: string, id: string, input: ReceiveInput): Promise<PurchaseActionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await receiveOrder(ctx.tenantId, id, input, ctx.memberId);
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_PURCHASE_RECEIVE", { orderId: id, units: r.received, status: r.status, invoice: input.invoice?.number ?? null });
  refresh(slug);
  return { ok: true, message: `${r.received} ${r.received === 1 ? "unidad entró" : "unidades entraron"} al inventario${r.status === "RECEIVED" ? " · orden completa" : ""}` };
}

export async function cancelOrderAction(slug: string, id: string): Promise<PurchaseActionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await cancelOrder(ctx.tenantId, id);
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_PURCHASE_CANCEL", { orderId: id, action: "cancel" });
  refresh(slug);
  return { ok: true, message: "Orden cancelada" };
}

export async function closeOrderAction(slug: string, id: string): Promise<PurchaseActionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await closeOrder(ctx.tenantId, id);
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_PURCHASE_CANCEL", { orderId: id, action: "close" });
  refresh(slug);
  return { ok: true, message: "Orden cerrada" };
}

export type SupplierInput = Pick<PartyInput, "kind" | "documentType" | "documentNumber" | "legalName" | "email" | "phone" | "city">;

export async function createSupplierAction(slug: string, input: SupplierInput): Promise<PurchaseActionResult & { duplicates?: DuplicateMatch[] }> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await createParty(ctx.tenantId, { ...input, roles: ["SUPPLIER"] });
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_SUPPLIER_CREATE", { partyId: r.party.id });
  refresh(slug);
  return { ok: true, id: r.party.id, message: "Proveedor creado", duplicates: r.possibleDuplicates };
}
