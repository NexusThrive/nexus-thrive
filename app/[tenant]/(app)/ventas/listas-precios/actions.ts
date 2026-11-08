"use server";

import { revalidatePath } from "next/cache";
import { createList, deleteList, makeDefault, renameList, saveListPrices, setListActive, type PriceListResult } from "@/lib/business/catalog/price-lists-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";

/** Listas de precios: solo quien gerencia el negocio las cambia (el servidor lo vuelve a exigir). */
const DENIED: PriceListResult = { ok: false, message: "Tu rol no permite cambiar las listas de precios." };

async function context(slug: string) {
  const ctx = await requireTenantContext(slug, "/ventas/listas-precios");
  return ctx && canManage(ctx.role) ? ctx : null;
}
const refresh = (slug: string) => revalidatePath(`/${slug}/ventas/listas-precios`, "layout");

export async function createPriceListAction(slug: string, name: string, isDefault: boolean): Promise<PriceListResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await createList(ctx.tenantId, name, isDefault);
  if (result.ok) refresh(slug);
  return result;
}

export async function renamePriceListAction(slug: string, id: string, name: string): Promise<PriceListResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await renameList(ctx.tenantId, id, name);
  if (result.ok) refresh(slug);
  return result;
}

export async function setPriceListActiveAction(slug: string, id: string, active: boolean): Promise<PriceListResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await setListActive(ctx.tenantId, id, active);
  if (result.ok) refresh(slug);
  return result;
}

export async function makeDefaultPriceListAction(slug: string, id: string): Promise<PriceListResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await makeDefault(ctx.tenantId, id);
  if (result.ok) refresh(slug);
  return result;
}

export async function deletePriceListAction(slug: string, id: string): Promise<PriceListResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await deleteList(ctx.tenantId, id);
  if (result.ok) refresh(slug);
  return result;
}

export async function savePriceListPricesAction(slug: string, id: string, prices: { productId: string; price: number | null }[]): Promise<PriceListResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await saveListPrices(ctx.tenantId, id, prices);
  if (result.ok) refresh(slug);
  return result;
}
