"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/business/permissions";
import { cancelOrder } from "@/lib/store/store-db";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export async function cancelOrderAction(slug: string, id: string): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const ctx = await requireTenantContext(slug, "/pedidos-tienda");
  if (!ctx || !can(ctx.role, "money.handle")) return { ok: false, message: "Tu rol no cancela pedidos." };
  const r = await cancelOrder(ctx.tenantId, id);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_STORE_ORDER", { action: "cancel", id });
  revalidatePath(`/${slug}/pedidos-tienda`);
  return { ok: true, message: "Pedido cancelado" };
}
