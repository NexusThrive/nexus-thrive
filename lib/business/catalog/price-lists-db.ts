import { db } from "@/prisma/db";
import { toNumber } from "@/lib/foundation/format";
import { createPriceList, setDefaultPriceList, setListPrice } from "./catalog-db";

/** Listas de precios (mayorista, detal, convenio…): lectura y mantenimiento de pantalla. La resolución de precios vive en `catalog-db`. */
export type PriceListRow = { id: string; name: string; isDefault: boolean; active: boolean; items: number };
export type PriceListLine = { productId: string; name: string; sku: string | null; basePrice: number; listPrice: number | null };

export async function listPriceLists(tenantId: string): Promise<PriceListRow[]> {
  const [lists, items] = await Promise.all([
    db.orm.public.PriceList.where({ tenantId }).orderBy((l) => l.name.asc()).limit(200).all(),
    db.orm.public.PriceListItem.where({ tenantId }).select("priceListId").limit(50_000).all(),
  ]);
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.priceListId, (counts.get(i.priceListId) ?? 0) + 1);
  return lists.map((l) => ({ id: l.id, name: l.name, isDefault: l.isDefault, active: l.active, items: counts.get(l.id) ?? 0 }));
}

/** Cada producto vendible con su precio base y el de la lista (sin variantes: son precios por producto). */
export async function priceListLines(tenantId: string, priceListId: string): Promise<{ list: PriceListRow; lines: PriceListLine[] } | null> {
  const lists = await listPriceLists(tenantId);
  const list = lists.find((l) => l.id === priceListId);
  if (!list) return null;
  const [products, items] = await Promise.all([
    db.orm.public.Product.where({ tenantId, active: true, sellable: true }).orderBy((p) => p.name.asc()).select("id", "name", "sku", "price").limit(5000).all(),
    db.orm.public.PriceListItem.where({ tenantId, priceListId }).where((i) => i.variantId.isNull()).select("productId", "price").limit(10_000).all(),
  ]);
  const byProduct = new Map(items.map((i) => [i.productId, toNumber(i.price)]));
  return { list, lines: products.map((p) => ({ productId: p.id, name: p.name, sku: p.sku, basePrice: toNumber(p.price), listPrice: byProduct.get(p.id) ?? null })) };
}

export type PriceListResult = { ok: true; id?: string; saved?: number } | { ok: false; message: string };

export async function createList(tenantId: string, name: string, isDefault: boolean): Promise<PriceListResult> {
  const result = await createPriceList(tenantId, { name, isDefault });
  return result.ok ? { ok: true, id: result.id } : { ok: false, message: result.message };
}

export async function renameList(tenantId: string, id: string, name: string): Promise<PriceListResult> {
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false, message: "Ponle un nombre a la lista." };
  const twin = await db.orm.public.PriceList.where({ tenantId, name: clean }).first();
  if (twin && twin.id !== id) return { ok: false, message: "Ya existe una lista con ese nombre." };
  if (!(await db.orm.public.PriceList.where({ tenantId, id }).first())) return { ok: false, message: "Esa lista ya no existe." };
  await db.orm.public.PriceList.where({ tenantId, id }).update({ name: clean });
  return { ok: true, id };
}

export async function setListActive(tenantId: string, id: string, active: boolean): Promise<PriceListResult> {
  const list = await db.orm.public.PriceList.where({ tenantId, id }).first();
  if (!list) return { ok: false, message: "Esa lista ya no existe." };
  if (list.isDefault && !active) return { ok: false, message: "La lista predeterminada no se puede desactivar: elige otra como predeterminada primero." };
  await db.orm.public.PriceList.where({ tenantId, id }).update({ active });
  return { ok: true, id };
}

export async function makeDefault(tenantId: string, id: string): Promise<PriceListResult> {
  return (await setDefaultPriceList(tenantId, id)) ? { ok: true, id } : { ok: false, message: "Esa lista ya no existe." };
}

export async function deleteList(tenantId: string, id: string): Promise<PriceListResult> {
  const list = await db.orm.public.PriceList.where({ tenantId, id }).first();
  if (!list) return { ok: false, message: "Esa lista ya no existe." };
  if (list.isDefault) return { ok: false, message: "No se puede borrar la lista predeterminada." };
  await db.orm.public.PriceList.where({ tenantId, id }).delete();
  return { ok: true };
}

/** Guarda precios de lista: con precio lo fija; con `null` quita el del producto (vuelve a valer el precio base). */
export async function saveListPrices(tenantId: string, priceListId: string, prices: { productId: string; price: number | null }[]): Promise<PriceListResult> {
  let saved = 0;
  for (const row of prices.slice(0, 2000)) {
    if (row.price == null) {
      await db.orm.public.PriceListItem.where({ tenantId, priceListId, productId: row.productId }).where((i) => i.variantId.isNull()).deleteAll();
      saved++;
      continue;
    }
    const result = await setListPrice(tenantId, { priceListId, productId: row.productId, price: row.price });
    if (!result.ok) return { ok: false, message: result.message };
    saved++;
  }
  return { ok: true, saved };
}
