"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/core/auth/permissions";
import { advanceOrder } from "@/lib/business/store/fulfillment-db";
import { FULFILLMENT_TEXT, isFulfillment } from "@/lib/business/store/fulfillment";
import { confirmDelivery, dispatchOrder } from "@/lib/business/store/delivery-db";
import { moveProduction } from "@/lib/business/store/production-db";
import { cancelOrder } from "@/lib/business/store/store-db";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type OrderResult = { ok: true; message: string } | { ok: false; message: string };
const refresh = (slug: string) => {
  revalidatePath(`/${slug}/orders`);
  revalidatePath(`/${slug}/cartera`);
};

async function ctxFor(slug: string) {
  const ctx = await requireTenantContext(slug, "/orders");
  return ctx && can(ctx.role, "orders.work") ? ctx : null;
}

/** Mueve el cumplimiento de un pedido (confirmar, producción, listo, enviado, entregado). Cancelar pasa por `cancelOrderAction`. */
export async function advanceOrderAction(slug: string, id: string, to: string, note = ""): Promise<OrderResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return { ok: false, message: "Tu rol no maneja pedidos." };
  if (!isFulfillment(to)) return { ok: false, message: "Ese estado no existe." };
  // Cancelar anula el cobro pendiente: es de quien maneja dinero.
  if (to === "CANCELED" && !can(ctx.role, "money.handle")) return { ok: false, message: "Cancelar un pedido lo hace quien maneja los cobros." };
  const r = to === "CANCELED" ? await cancelOrder(ctx.tenantId, id) : await advanceOrder(ctx.tenantId, id, to, ctx.memberId, note);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_STORE_ORDER", { action: to === "CANCELED" ? "cancel" : "advance", id, to });
  refresh(slug);
  return { ok: true, message: `Pedido ${FULFILLMENT_TEXT[to].toLowerCase()}` };
}

/** Mueve una orden de producción de etapa; si era la última del pedido, el pedido queda listo. */
export async function moveProductionAction(slug: string, id: string, to: string): Promise<OrderResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return { ok: false, message: "Tu rol no maneja pedidos." };
  const r = await moveProduction(ctx.tenantId, id, to, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_STORE_ORDER", { action: "production", id, to });
  refresh(slug);
  return { ok: true, message: r.orderReady ? "Terminada: el pedido quedó listo" : to === "DONE" ? "Orden terminada" : "Orden actualizada" };
}

export type DeliveryResult = { ok: true; message: string } | { ok: false; message: string; fields?: Record<string, string> };

/** Despacha un pedido listo: guarda método, transportadora, guía y fecha, y lo marca enviado. */
export async function dispatchOrderAction(slug: string, id: string, input: { method: string; carrier?: string; trackingCode?: string; scheduledFor?: string; note?: string }): Promise<DeliveryResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return { ok: false, message: "Tu rol no maneja pedidos." };
  const r = await dispatchOrder(ctx.tenantId, id, input, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_STORE_ORDER", { action: "dispatch", id, method: input.method });
  refresh(slug);
  return { ok: true, message: "Pedido enviado" };
}

/** Confirma la entrega; si el pedido no está pagado, avisa del saldo que falta cobrar. */
export async function confirmDeliveryAction(slug: string, id: string, receivedBy: string): Promise<DeliveryResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return { ok: false, message: "Tu rol no maneja pedidos." };
  const r = await confirmDelivery(ctx.tenantId, id, receivedBy, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_STORE_ORDER", { action: "deliver", id });
  refresh(slug);
  return { ok: true, message: r.balanceDue > 0 ? `Pedido entregado. Falta cobrar $ ${r.balanceDue.toLocaleString("es-CO")}: regístralo en Cobros.` : "Pedido entregado" };
}
