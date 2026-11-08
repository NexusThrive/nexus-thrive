import { db } from "@/prisma/db";
import { createVariant, listVariants } from "./catalog-db";
import { MAX_VARIANTS, missingVariants, variantCombinations, variantCount, type AttributeLine } from "./variant-matrix";

/** Atributos de producto (Talla, Color…), sus valores y las variantes que generan. Siempre por `tenantId`. */
export type AttributeDisplay = "SELECT" | "BUTTONS" | "COLOR";
export type VariantMode = "ALWAYS" | "NEVER" | "CUSTOM";
export type AttributeRow = { id: string; name: string; display: AttributeDisplay; variantMode: VariantMode; values: { id: string; name: string; colorHex: string | null }[] };
export type AttributeInput = { id?: string; name: string; display: AttributeDisplay; variantMode: VariantMode; values: { id?: string; name: string; colorHex?: string | null }[] };

const DISPLAYS: readonly string[] = ["SELECT", "BUTTONS", "COLOR"];
const MODES: readonly string[] = ["ALWAYS", "NEVER", "CUSTOM"];
const HEX = /^#[0-9a-fA-F]{6}$/;

export async function listAttributes(tenantId: string): Promise<AttributeRow[]> {
  const [attributes, values] = await Promise.all([
    db.orm.public.ProductAttribute.where({ tenantId }).orderBy((a) => a.position.asc()).limit(200).all(),
    db.orm.public.ProductAttributeValue.where({ tenantId }).orderBy((v) => v.position.asc()).limit(5000).all(),
  ]);
  return attributes.map((a) => ({
    id: a.id,
    name: a.name,
    display: (DISPLAYS.includes(a.display) ? a.display : "SELECT") as AttributeDisplay,
    variantMode: (MODES.includes(a.variantMode) ? a.variantMode : "ALWAYS") as VariantMode,
    values: values.filter((v) => v.attributeId === a.id).map((v) => ({ id: v.id, name: v.name, colorHex: v.colorHex })),
  }));
}

export type SaveResult = { ok: true; id: string } | { ok: false; message: string };

/** Crea o actualiza un atributo con sus valores (los que ya no vienen se quitan, también de los productos que los usaban). */
export async function saveAttribute(tenantId: string, input: AttributeInput): Promise<SaveResult> {
  const name = input.name.trim().slice(0, 60);
  if (!name) return { ok: false, message: "Escribe el nombre del atributo." };
  if (!DISPLAYS.includes(input.display) || !MODES.includes(input.variantMode)) return { ok: false, message: "Revisa cómo se muestra y si crea variantes." };
  const seen = new Set<string>();
  const values = [];
  for (const v of input.values) {
    const label = v.name.trim().slice(0, 60);
    if (!label) continue;
    if (seen.has(label.toLowerCase())) return { ok: false, message: `El valor «${label}» está repetido.` };
    seen.add(label.toLowerCase());
    if (v.colorHex && !HEX.test(v.colorHex)) return { ok: false, message: `El color de «${label}» no es válido.` };
    values.push({ id: v.id, name: label, colorHex: input.display === "COLOR" ? (v.colorHex ?? null) : null });
  }
  if (input.variantMode !== "CUSTOM" && values.length === 0) return { ok: false, message: "Agrega al menos un valor (o márcalo como personalizado)." };

  const twin = await db.orm.public.ProductAttribute.where({ tenantId, name }).first();
  if (twin && twin.id !== input.id) return { ok: false, message: "Ya existe un atributo con ese nombre." };

  let id = input.id;
  if (id) {
    const current = await db.orm.public.ProductAttribute.where({ tenantId, id }).first();
    if (!current) return { ok: false, message: "Ese atributo ya no existe." };
    await db.orm.public.ProductAttribute.where({ tenantId, id }).update({ name, display: input.display, variantMode: input.variantMode });
  } else {
    const position = (await db.orm.public.ProductAttribute.where({ tenantId }).select("id").limit(500).all()).length;
    id = (await db.orm.public.ProductAttribute.create({ tenantId, name, display: input.display, variantMode: input.variantMode, position })).id;
  }

  const existing = await db.orm.public.ProductAttributeValue.where({ tenantId, attributeId: id }).all();
  const keep = new Set(values.map((v) => v.id).filter(Boolean));
  const removed = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
  for (const [position, v] of values.entries()) {
    if (v.id && existing.some((e) => e.id === v.id)) await db.orm.public.ProductAttributeValue.where({ tenantId, id: v.id }).update({ name: v.name, colorHex: v.colorHex, position });
    else await db.orm.public.ProductAttributeValue.create({ tenantId, attributeId: id, name: v.name, colorHex: v.colorHex, position });
  }
  if (removed.length) {
    const lines = await db.orm.public.ProductAttributeLine.where({ tenantId, attributeId: id }).all();
    for (const line of lines) {
      const next = line.valueIds.filter((x) => !removed.includes(x));
      if (next.length !== line.valueIds.length) await db.orm.public.ProductAttributeLine.where({ tenantId, id: line.id }).update({ valueIds: next });
    }
    for (const valueId of removed) await db.orm.public.ProductAttributeValue.where({ tenantId, id: valueId }).delete();
  }
  return { ok: true, id };
}

export async function deleteAttribute(tenantId: string, id: string): Promise<void> {
  await db.orm.public.ProductAttribute.where({ tenantId, id }).delete();
}

/** Los atributos de un producto con los valores que ofrece (para el formulario y para generar variantes). */
export async function productAttributeLines(tenantId: string, productId: string): Promise<(AttributeLine & { valueIds: string[]; all: { id: string; name: string; colorHex: string | null }[] })[]> {
  const [lines, attributes] = await Promise.all([db.orm.public.ProductAttributeLine.where({ tenantId, productId }).all(), listAttributes(tenantId)]);
  return lines.flatMap((line) => {
    const attribute = attributes.find((a) => a.id === line.attributeId);
    if (!attribute) return [];
    const chosen = attribute.values.filter((v) => line.valueIds.includes(v.id));
    return [{ attributeId: attribute.id, attributeName: attribute.name, variantMode: attribute.variantMode, values: chosen.map((v) => ({ id: v.id, name: v.name })), valueIds: [...line.valueIds], all: attribute.values }];
  });
}

/** Reemplaza los atributos del producto. Los valores deben ser del atributo; en los personalizados no se guardan valores. */
export async function setProductAttributeLines(tenantId: string, productId: string, lines: { attributeId: string; valueIds: string[] }[]): Promise<{ ok: true } | { ok: false; message: string }> {
  const product = await db.orm.public.Product.where({ tenantId, id: productId }).first();
  if (!product) return { ok: false, message: "No se encontró el producto." };
  const attributes = await listAttributes(tenantId);
  const clean: { attributeId: string; valueIds: string[] }[] = [];
  for (const line of lines) {
    const attribute = attributes.find((a) => a.id === line.attributeId);
    if (!attribute || clean.some((c) => c.attributeId === attribute.id)) continue;
    // Un atributo personalizado (texto libre al vender) solo va en los productos marcados como personalizables.
    if (attribute.variantMode === "CUSTOM" && !product.customizable) return { ok: false, message: `«${attribute.name}» es personalizado: marca el producto como personalizable para usarlo.` };
    const valid = new Set(attribute.values.map((v) => v.id));
    clean.push({ attributeId: attribute.id, valueIds: attribute.variantMode === "CUSTOM" ? [] : [...new Set(line.valueIds)].filter((id) => valid.has(id)) });
  }
  await db.orm.public.ProductAttributeLine.where({ tenantId, productId }).deleteAll();
  for (const line of clean) await db.orm.public.ProductAttributeLine.create({ tenantId, productId, attributeId: line.attributeId, valueIds: line.valueIds });
  return { ok: true };
}

/** Crea las variantes que faltan para las combinaciones de los atributos del producto. No toca las que ya existen. */
export async function generateProductVariants(tenantId: string, productId: string): Promise<{ ok: true; created: number; total: number } | { ok: false; message: string }> {
  const product = await db.orm.public.Product.where({ tenantId, id: productId }).first();
  if (!product) return { ok: false, message: "No se encontró el producto." };
  const lines = await productAttributeLines(tenantId, productId);
  const count = variantCount(lines);
  if (count === 0) return { ok: false, message: "Ningún atributo del producto crea variantes. Agrega uno con valores." };
  if (count > MAX_VARIANTS) return { ok: false, message: `Saldrían ${count} variantes y el máximo es ${MAX_VARIANTS}. Quita valores o atributos.` };
  const existing = await listVariants(tenantId, productId);
  const missing = missingVariants(variantCombinations(product.name, lines), existing);
  let created = 0;
  for (const combo of missing) {
    const made = await createVariant(tenantId, productId, { name: combo.name, attributes: combo.attributes });
    if (made.ok) created++;
  }
  return { ok: true, created, total: existing.length + created };
}
