import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import { checkBarcode } from "./barcode";

/**
 * Catálogo maestro: variantes, códigos de barras, listas de precios y
 * clasificación fiscal por ítem. Todo se valida contra el negocio (un producto o
 * variante de otro negocio no se puede tocar ni leer).
 */
const money = (n: number) => n.toFixed(2);
const isUnique = (error: unknown) => /unique|duplicate key/i.test(String((error as Error)?.message ?? error));

export type CatalogResult<T> = ({ ok: true } & T) | { ok: false; message: string; code?: string };

async function productOf(tenantId: string, productId: string) {
  return db.orm.public.Product.where({ tenantId, id: productId }).first();
}
async function variantOf(tenantId: string, productId: string, variantId: string) {
  return db.orm.public.ProductVariant.where({ tenantId, productId, id: variantId }).first();
}

// ── Variantes ──────────────────────────────────────────────────────────────

export type VariantInput = { name: string; sku?: string | null; attributes?: Record<string, string>; price?: number | null; cost?: number | null };

export async function createVariant(tenantId: string, productId: string, input: VariantInput): Promise<CatalogResult<{ id: string }>> {
  if (!(await productOf(tenantId, productId))) return { ok: false, message: "No se encontró el producto." };
  const name = input.name.trim().slice(0, 120);
  if (name.length < 1) return { ok: false, message: "Ponle un nombre a la variante (por ejemplo, «Talla M»)." };
  if (input.price != null && (!Number.isFinite(input.price) || input.price < 0)) return { ok: false, message: "El precio no es válido." };
  try {
    const created = await db.orm.public.ProductVariant.create({
      tenantId,
      productId,
      name,
      sku: input.sku?.trim() || null,
      attributes: input.attributes ?? {},
      price: input.price == null ? null : money(input.price),
      cost: input.cost == null ? null : money(input.cost),
    });
    return { ok: true, id: created.id };
  } catch (error) {
    if (isUnique(error)) return { ok: false, code: "duplicate_sku", message: "Ya hay otra variante con ese SKU." };
    throw error;
  }
}

export async function listVariants(tenantId: string, productId: string) {
  const rows = await db.orm.public.ProductVariant.where({ tenantId, productId, active: true }).orderBy((v) => v.name.asc()).all();
  return rows.map((v) => ({ id: v.id, name: v.name, sku: v.sku ?? null, attributes: (v.attributes ?? {}) as Record<string, string>, price: v.price == null ? null : toNumber(v.price) }));
}

// ── Códigos de barras ──────────────────────────────────────────────────────

export async function addBarcode(tenantId: string, input: { productId: string; variantId?: string | null; code: string }): Promise<CatalogResult<{ id: string; code: string }>> {
  const checked = checkBarcode(input.code);
  if (!checked.ok) return { ok: false, code: "invalid_barcode", message: checked.message };
  if (!(await productOf(tenantId, input.productId))) return { ok: false, message: "No se encontró el producto." };
  if (input.variantId && !(await variantOf(tenantId, input.productId, input.variantId))) return { ok: false, message: "La variante no es de este producto." };
  const taken = await db.orm.public.ProductBarcode.where({ tenantId, code: checked.code }).first();
  if (taken) return { ok: false, code: "duplicate_barcode", message: "Ese código ya está asignado a otro producto." };
  try {
    const created = await db.orm.public.ProductBarcode.create({ tenantId, productId: input.productId, variantId: input.variantId ?? null, code: checked.code, symbology: checked.symbology });
    return { ok: true, id: created.id, code: created.code };
  } catch (error) {
    if (isUnique(error)) return { ok: false, code: "duplicate_barcode", message: "Ese código ya está asignado a otro producto." };
    throw error;
  }
}

// ── Listas de precios ──────────────────────────────────────────────────────

export async function createPriceList(tenantId: string, input: { name: string; isDefault?: boolean }): Promise<CatalogResult<{ id: string }>> {
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, message: "Ponle un nombre a la lista." };
  try {
    const created = await db.orm.public.PriceList.create({ tenantId, name, isDefault: false });
    if (input.isDefault) await setDefaultPriceList(tenantId, created.id);
    return { ok: true, id: created.id };
  } catch (error) {
    if (isUnique(error)) return { ok: false, code: "duplicate_name", message: "Ya existe una lista con ese nombre." };
    throw error;
  }
}

/** Solo una lista es la predeterminada del negocio. */
export async function setDefaultPriceList(tenantId: string, id: string): Promise<boolean> {
  const list = await db.orm.public.PriceList.where({ tenantId, id }).first();
  if (!list) return false;
  for (const other of await db.orm.public.PriceList.where({ tenantId, isDefault: true }).all()) {
    if (other.id !== id) await db.orm.public.PriceList.where({ tenantId, id: other.id }).update({ isDefault: false });
  }
  await db.orm.public.PriceList.where({ tenantId, id }).update({ isDefault: true });
  return true;
}

export async function setListPrice(tenantId: string, input: { priceListId: string; productId: string; variantId?: string | null; price: number }): Promise<CatalogResult<{ id: string }>> {
  if (!Number.isFinite(input.price) || input.price < 0) return { ok: false, message: "El precio no es válido." };
  if (!(await db.orm.public.PriceList.where({ tenantId, id: input.priceListId }).first())) return { ok: false, message: "No se encontró la lista." };
  if (!(await productOf(tenantId, input.productId))) return { ok: false, message: "No se encontró el producto." };
  if (input.variantId && !(await variantOf(tenantId, input.productId, input.variantId))) return { ok: false, message: "La variante no es de este producto." };
  const where = { tenantId, priceListId: input.priceListId, productId: input.productId };
  const find = () => (input.variantId ? db.orm.public.PriceListItem.where({ tenantId, priceListId: input.priceListId, productId: input.productId, variantId: input.variantId }).first() : db.orm.public.PriceListItem.where(where).where((i) => i.variantId.isNull()).first());
  const existing = await find();
  if (existing) {
    await db.orm.public.PriceListItem.where({ tenantId, id: existing.id }).update({ price: money(input.price) });
    return { ok: true, id: existing.id };
  }
  try {
    const created = await db.orm.public.PriceListItem.create({ ...where, variantId: input.variantId ?? null, price: money(input.price) });
    return { ok: true, id: created.id };
  } catch (error) {
    if (!isUnique(error)) throw error;
    const raced = await find(); // otra petición lo creó a la vez: se actualiza ese
    await db.orm.public.PriceListItem.where({ tenantId, id: raced!.id }).update({ price: money(input.price) });
    return { ok: true, id: raced!.id };
  }
}

export type PriceSource = "list_variant" | "list_product" | "variant" | "product";

/**
 * Precio de venta: lista (variante → producto) → variante → producto. Sin
 * `priceListId` usa la lista predeterminada, si existe.
 */
export async function resolvePrice(tenantId: string, input: { productId: string; variantId?: string | null; priceListId?: string | null }): Promise<{ price: number; source: PriceSource } | null> {
  const product = await productOf(tenantId, input.productId);
  if (!product) return null;
  const variant = input.variantId ? await variantOf(tenantId, input.productId, input.variantId) : null;
  if (input.variantId && !variant) return null;
  const listId = input.priceListId ?? (await db.orm.public.PriceList.where({ tenantId, isDefault: true, active: true }).first())?.id ?? null;
  if (listId) {
    const base = { tenantId, priceListId: listId, productId: input.productId };
    if (variant) {
      const v = await db.orm.public.PriceListItem.where({ tenantId, priceListId: listId, productId: input.productId, variantId: variant.id }).first();
      if (v) return { price: toNumber(v.price), source: "list_variant" };
    }
    const p = await db.orm.public.PriceListItem.where(base).where((i) => i.variantId.isNull()).first();
    if (p) return { price: toNumber(p.price), source: "list_product" };
  }
  if (variant?.price != null) return { price: toNumber(variant.price), source: "variant" };
  return { price: toNumber(product.price), source: "product" };
}

// ── Búsqueda por código de barras ──────────────────────────────────────────

export type BarcodeHit = {
  product: { id: string; name: string; sku: string | null; kind: string; category: string | null; active: boolean; trackStock: boolean; stock: number | null };
  variant: { id: string; name: string; sku: string | null; attributes: Record<string, string> } | null;
  price: number;
  priceSource: PriceSource;
};

export async function findByBarcode(tenantId: string, rawCode: string, priceListId?: string | null): Promise<BarcodeHit | null> {
  const code = rawCode.replace(/[\s\u0000-\u001f]/g, "");
  const barcode = code ? await db.orm.public.ProductBarcode.where({ tenantId, code }).first() : null;
  if (!barcode) return null;
  const product = await productOf(tenantId, barcode.productId);
  if (!product) return null;
  const variant = barcode.variantId ? await variantOf(tenantId, barcode.productId, barcode.variantId) : null;
  const resolved = await resolvePrice(tenantId, { productId: product.id, variantId: variant?.id, priceListId });
  if (!resolved) return null;
  return {
    product: { id: product.id, name: product.name, sku: product.sku ?? null, kind: String(product.kind), category: product.category ?? null, active: product.active, trackStock: product.trackStock, stock: product.trackStock ? product.stock : null },
    variant: variant ? { id: variant.id, name: variant.name, sku: variant.sku ?? null, attributes: (variant.attributes ?? {}) as Record<string, string> } : null,
    price: resolved.price,
    priceSource: resolved.source,
  };
}

// ── Clasificación fiscal por ítem ──────────────────────────────────────────

export const TAX_CATEGORIES = ["GRAVADO", "EXCLUIDO", "EXENTO"] as const;
export const UNIT_CODES = ["EA", "KGM", "GRM", "LTR", "MTR", "MTK", "HUR", "DAY", "MON", "SET", "BX"] as const;

export async function setProductTax(tenantId: string, productId: string, input: { taxCategory: (typeof TAX_CATEGORIES)[number]; taxRatePct?: number; unitCode?: (typeof UNIT_CODES)[number] }): Promise<CatalogResult<object>> {
  if (!(await productOf(tenantId, productId))) return { ok: false, message: "No se encontró el producto." };
  if (!TAX_CATEGORIES.includes(input.taxCategory)) return { ok: false, message: "La categoría de impuesto no es válida." };
  const rate = input.taxCategory === "GRAVADO" ? (input.taxRatePct ?? 0) : 0; // excluido y exento no cobran IVA
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return { ok: false, message: "La tarifa debe estar entre 0 y 100." };
  if (input.unitCode && !UNIT_CODES.includes(input.unitCode)) return { ok: false, message: "La unidad de medida no es válida." };
  await db.orm.public.Product.where({ tenantId, id: productId }).update({ taxCategory: input.taxCategory, taxRatePct: rate.toFixed(2), ...(input.unitCode ? { unitCode: input.unitCode } : {}) });
  return { ok: true };
}
