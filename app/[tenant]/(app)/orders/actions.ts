"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/core/auth/permissions";
import { advanceOrder } from "@/lib/business/store/fulfillment-db";
import { FULFILLMENT_TEXT, isFulfillment } from "@/lib/business/store/fulfillment";
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
  return ctx && can(ctx.role, "money.handle") ? ctx : null;
}

/** Mueve el cumplimiento de un pedido (confirmar, producción, listo, enviado, entregado). Cancelar pasa por `cancelOrderAction`. */
export async function advanceOrderAction(slug: string, id: string, to: string, note = ""): Promise<OrderResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return { ok: false, message: "Tu rol no maneja pedidos." };
  if (!isFulfillment(to)) return { ok: false, message: "Ese estado no existe." };
  const r = to === "CANCELED" ? await cancelOrder(ctx.tenantId, id) : await advanceOrder(ctx.tenantId, id, to, ctx.memberId, note);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_STORE_ORDER", { action: to === "CANCELED" ? "cancel" : "advance", id, to });
  refresh(slug);
  return { ok: true, message: `Pedido ${FULFILLMENT_TEXT[to].toLowerCase()}` };
}
