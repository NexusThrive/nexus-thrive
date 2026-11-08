import { db } from "@/prisma/db";
import { toNumber } from "@/lib/foundation/format";
import { addBarcode } from "./catalog-db";
import { generateProductVariants, setProductAttributeLines } from "./attributes-db";
import { moveStock, type ProductKindValue } from "./products-db";
import type { ProductFormDraft } from "./product-form";

/** Guardado y lectura del formulario de producto en página (servidor, siempre por `tenantId`). */
const dec = (n: number) => n.toFixed(2);
const t = (x: string, max: number) => x.trim().slice(0, max) || null;

export type ProductFormLoaded = ProductFormDraft & { id: string; stock: number; imageUrl: string | null; barcodes: string[]; variantCount: number };

export async function loadProductForm(tenantId: string, id: string): Promise<ProductFormLoaded | null> {
  const p = await db.orm.public.Product.where({ tenantId, id }).first();
  if (!p) return null;
  const [barcodes, lines, variants] = await Promise.all([
    db.orm.public.ProductBarcode.where({ tenantId, productId: id }).where((b) => b.variantId.isNull()).orderBy((b) => b.createdAt.asc()).all(),
    db.orm.public.ProductAttributeLine.where({ tenantId, productId: id }).all(),
    db.orm.public.ProductVariant.where({ tenantId, productId: id, active: true }).select("id").limit(500).all(),
  ]);
  return {
    id: p.id,
    kind: p.kind as ProductKindValue,
    name: p.name,
    description: p.description ?? "",
    sku: p.sku ?? "",
    barcode: barcodes[0]?.code ?? "",
    barcodes: barcodes.map((b) => b.code),
    categoryId: p.categoryId ?? "",
    brand: p.brand ?? "",
    unitCode: p.unitCode,
    taxCategory: (["GRAVADO", "EXCLUIDO", "EXENTO"].includes(p.taxCategory) ? p.taxCategory : "GRAVADO") as ProductFormDraft["taxCategory"],
    taxRatePct: toNumber(p.taxRatePct),
    price: toNumber(p.price),
    cost: p.cost == null ? null : toNumber(p.cost),
    trackStock: p.trackStock,
    initialStock: null,
    stock: p.stock,
    minStock: p.minStock,
    maxStock: p.maxStock,
    reorderPoint: p.reorderPoint,
    durationMinutes: p.durationMinutes,
    durationDays: p.durationDays,
    capacity: p.capacity,
    active: p.active,
    favorite: p.favorite,
    sellable: p.sellable,
    purchasable: p.purchasable,
    posEnabled: p.posEnabled,
    customizable: p.customizable,
    publishedOnline: p.publishedOnline,
    internalNotes: p.internalNotes ?? "",
    imageUrl: p.imageUrl,
    attributeLines: lines.map((l) => ({ attributeId: l.attributeId, valueIds: [...l.valueIds] })),
    generateVariants: false,
    variantCount: variants.length,
  };
}

export type SaveFormResult = { ok: true; id: string; message: string; variantsCreated?: number } | { ok: false; message: string; errors?: Partial<Record<keyof ProductFormDraft, string>> };

/**
 * Crea o actualiza un producto con todo lo del formulario: datos, categoría, impuesto, código de barras, atributos y variantes. Si algo
 * secundario falla (un código de barras repetido, por ejemplo) el producto queda guardado y el mensaje lo dice.
 */
export async function saveProductForm(tenantId: string, id: string | null, d: ProductFormDraft, userId: string, imageUrl?: string | null): Promise<SaveFormResult> {
  let categoryName: string | null = null;
  let categoryId: string | null = null;
  if (d.categoryId) {
    const cat = await db.orm.public.ProductCategory.where({ tenantId, id: d.categoryId }).first();
    if (!cat) return { ok: false, message: "Esa categoría ya no existe.", errors: { categoryId: "Elige otra categoría." } };
    categoryId = cat.id;
    categoryName = cat.name;
  }
  if (d.sku.trim()) {
    const twin = await db.orm.public.Product.where({ tenantId, sku: d.sku.trim() }).first();
    if (twin && twin.id !== id) return { ok: false, message: "Ya hay otro producto con ese SKU.", errors: { sku: "Ese SKU ya existe." } };
  }
  const isProduct = d.kind === "PRODUCT";
  const data = {
    kind: d.kind,
    name: d.name.trim().slice(0, 120),
    description: t(d.description, 500),
    sku: t(d.sku, 40),
    category: categoryName,
    categoryId,
    brand: t(d.brand, 60),
    unitCode: d.unitCode,
    taxCategory: d.taxCategory,
    taxRatePct: dec(d.taxCategory === "GRAVADO" ? d.taxRatePct : 0),
    price: dec(d.price!),
    cost: d.cost == null ? null : dec(d.cost),
    trackStock: isProduct ? d.trackStock : false,
    minStock: d.minStock ?? 0,
    maxStock: d.maxStock,
    reorderPoint: d.reorderPoint,
    durationMinutes: d.durationMinutes,
    durationDays: d.kind === "PLAN" ? d.durationDays : null,
    capacity: d.capacity,
    active: d.active,
    favorite: d.favorite,
    sellable: d.sellable,
    purchasable: d.purchasable,
    posEnabled: d.posEnabled,
    customizable: d.customizable,
    publishedOnline: d.publishedOnline,
    internalNotes: t(d.internalNotes, 2000),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  };
  let productId = id;
  if (id) {
    if (!(await db.orm.public.Product.where({ tenantId, id }).first())) return { ok: false, message: "No se encontró el producto." };
    await db.orm.public.Product.where({ tenantId, id }).update(data);
  } else {
    productId = (await db.orm.public.Product.create({ tenantId, ...data, stock: 0 })).id;
    if (data.trackStock && d.initialStock && d.initialStock > 0) await moveStock(tenantId, productId, "IN", d.initialStock, "Inventario inicial", userId);
  }
  const notes: string[] = [];

  // Código de barras: el que escribe la persona es el principal; si cambia, se reemplaza el anterior.
  const code = d.barcode.trim();
  const current = await db.orm.public.ProductBarcode.where({ tenantId, productId: productId!, variantId: null }).all();
  if (code && !current.some((b) => b.code === code)) {
    const added = await addBarcode(tenantId, { productId: productId!, code });
    if (added.ok) for (const old of current) await db.orm.public.ProductBarcode.where({ tenantId, id: old.id }).delete();
    else notes.push(added.message);
  } else if (!code) {
    for (const old of current) await db.orm.public.ProductBarcode.where({ tenantId, id: old.id }).delete();
  }

  const lines = await setProductAttributeLines(tenantId, productId!, d.attributeLines);
  if (!lines.ok) notes.push(lines.message);
  let variantsCreated: number | undefined;
  if (lines.ok && d.generateVariants && d.attributeLines.length > 0) {
    const made = await generateProductVariants(tenantId, productId!);
    if (made.ok) variantsCreated = made.created;
    else if (!/Ningún atributo/.test(made.message)) notes.push(made.message);
  }
  const base = id ? "Cambios guardados" : "Producto creado";
  return { ok: true, id: productId!, variantsCreated, message: notes.length ? `${base}, pero: ${notes.join(" ")}` : variantsCreated ? `${base} con ${variantsCreated} variantes` : base };
}

/** Guarda la foto principal del producto (la ruta del archivo que ya se subió al negocio). */
export async function setProductImage(tenantId: string, id: string, imageUrl: string | null): Promise<void> {
  await db.orm.public.Product.where({ tenantId, id }).update({ imageUrl });
}
