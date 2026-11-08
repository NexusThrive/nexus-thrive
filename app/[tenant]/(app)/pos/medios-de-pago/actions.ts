"use server";

import { revalidatePath } from "next/cache";
import { deleteMethod, moveMethod, saveMethod, setMethodActive, type MethodResult } from "@/lib/business/sales/payment-methods-db";
import type { MethodDraft } from "@/lib/business/sales/payment-methods";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { logTenantAction } from "@/lib/core/tenancy/audit";

/** Medios de pago del negocio: solo quien gerencia el negocio los cambia (el servidor lo vuelve a exigir). */
const DENIED: MethodResult = { ok: false, message: "Tu rol no permite cambiar los medios de pago." };

async function context(slug: string) {
  const ctx = await requireTenantContext(slug, "/pos/medios-de-pago");
  return ctx && canManage(ctx.role) ? ctx : null;
}
const refresh = (slug: string) => revalidatePath(`/${slug}/pos`, "layout");

export async function saveMethodAction(slug: string, draft: MethodDraft, id?: string): Promise<MethodResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await saveMethod(ctx.tenantId, draft, id);
  if (result.ok) {
    await logTenantAction(ctx, "BIZ_PAYMENT_METHOD", { change: id ? "payment_method.update" : "payment_method.create", methodId: result.id });
    refresh(slug);
  }
  return result;
}

export async function setMethodActiveAction(slug: string, id: string, active: boolean): Promise<MethodResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await setMethodActive(ctx.tenantId, id, active);
  if (result.ok) {
    await logTenantAction(ctx, "BIZ_PAYMENT_METHOD", { change: active ? "payment_method.enable" : "payment_method.disable", methodId: id });
    refresh(slug);
  }
  return result;
}

export async function moveMethodAction(slug: string, id: string, direction: -1 | 1): Promise<MethodResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await moveMethod(ctx.tenantId, id, direction);
  if (result.ok) refresh(slug);
  return result;
}

export async function deleteMethodAction(slug: string, id: string): Promise<MethodResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await deleteMethod(ctx.tenantId, id);
  if (result.ok) {
    await logTenantAction(ctx, "BIZ_PAYMENT_METHOD", { change: "payment_method.delete", methodId: id });
    refresh(slug);
  }
  return result;
}
