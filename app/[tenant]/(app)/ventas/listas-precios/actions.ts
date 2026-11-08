"use server";

import { revalidatePath } from "next/cache";
import { createList, deleteList, makeDefault, renameList, saveListPrices, setListActive, type PriceListResult } from "@/lib/business/catalog/price-lists-db";
import { assignPriceList, saveTiers } from "@/lib/business/catalog/pricing-db";
import type { PriceTierInput } from "@/lib/business/catalog/pricing";
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

/** Precios por cantidad de un producto en la lista (reemplaza los que tenía). */
export async function savePriceTiersAction(slug: string, priceListId: string, productId: string, tiers: PriceTierInput[]): Promise<PriceListResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await saveTiers(ctx.tenantId, priceListId, productId, tiers);
  if (!result.ok) return result;
  refresh(slug);
  return { ok: true };
}

/** A quién se aplica la lista: un cliente o un grupo (con `listId: null` se la quita). */
export async function assignPriceListAction(slug: string, target: { customerId?: string; groupId?: string }, listId: string | null): Promise<PriceListResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await assignPriceList(ctx.tenantId, target, listId);
  if (!result.ok) return result;
  refresh(slug);
  return { ok: true };
}
