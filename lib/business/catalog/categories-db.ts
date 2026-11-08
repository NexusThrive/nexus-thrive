import { db } from "@/prisma/db";
import { checkCategoryParent, type CategoryRow } from "./category-tree";

/** Categorías de productos del negocio (servidor, siempre por `tenantId`). */
const MAX_PRODUCTS_COUNTED = 50_000;

export type CategoryResult = { ok: true; id: string } | { ok: false; message: string };

/** Categorías con cuántos productos tiene cada una. */
export async function listCategories(tenantId: string): Promise<CategoryRow[]> {
  const [categories, products] = await Promise.all([
    db.orm.public.ProductCategory.where({ tenantId }).orderBy((c) => c.position.asc()).limit(1000).all(),
    db.orm.public.Product.where({ tenantId }).select("categoryId").limit(MAX_PRODUCTS_COUNTED).all(),
  ]);
  const counts = new Map<string, number>();
  for (const p of products) if (p.categoryId) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
  return categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId, position: c.position, products: counts.get(c.id) ?? 0 }));
}

/**
 * Los productos de antes (y las importaciones) traen la categoría como texto. Aquí se vuelve categoría de verdad: se crea una por cada
 * nombre distinto y se enlazan los productos. Es idempotente: sin productos sueltos no hace nada.
 */
export async function syncCategoriesFromText(tenantId: string): Promise<number> {
  const loose = await db.orm.public.Product.where({ tenantId }).where((p) => p.categoryId.isNull()).where((p) => p.category.isNotNull()).select("id", "category").limit(5000).all();
  const names = [...new Set(loose.map((p) => p.category!.trim()).filter(Boolean))];
  if (names.length === 0) return 0;
  const existing = await db.orm.public.ProductCategory.where({ tenantId }).where((c) => c.parentId.isNull()).select("id", "name").all();
  const byName = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c.id]));
  for (const name of names) {
    if (byName.has(name.toLowerCase())) continue;
    const created = await db.orm.public.ProductCategory.create({ tenantId, name: name.slice(0, 60) });
    byName.set(name.toLowerCase(), created.id);
  }
  for (const p of loose) {
    const id = byName.get(p.category!.trim().toLowerCase());
    if (id) await db.orm.public.Product.where({ tenantId, id: p.id }).update({ categoryId: id });
  }
  return names.length;
}

export async function saveCategory(tenantId: string, input: { id?: string; name: string; parentId: string | null }): Promise<CategoryResult> {
  const rows = await listCategories(tenantId);
  const check = checkCategoryParent(rows, input);
  if (!check.ok) return check;
  const name = input.name.trim().slice(0, 60);
  if (input.id) {
    if (!rows.some((r) => r.id === input.id)) return { ok: false, message: "Esa categoría ya no existe." };
    await db.orm.public.ProductCategory.where({ tenantId, id: input.id }).update({ name, parentId: input.parentId });
    // El texto de los productos sigue al nombre, para que las listas y las importaciones lo vean igual.
    await db.orm.public.Product.where({ tenantId, categoryId: input.id }).update({ category: name });
    return { ok: true, id: input.id };
  }
  const position = rows.filter((r) => r.parentId === input.parentId).length;
  const created = await db.orm.public.ProductCategory.create({ tenantId, name, parentId: input.parentId, position });
  return { ok: true, id: created.id };
}

/** Borra una categoría sin subcategorías. Sus productos quedan sin categoría (no se borran). */
export async function deleteCategory(tenantId: string, id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const rows = await listCategories(tenantId);
  if (!rows.some((r) => r.id === id)) return { ok: false, message: "Esa categoría ya no existe." };
  if (rows.some((r) => r.parentId === id)) return { ok: false, message: "Tiene subcategorías: bórralas o muévelas primero." };
  await db.orm.public.Product.where({ tenantId, categoryId: id }).update({ category: null });
  await db.orm.public.ProductCategory.where({ tenantId, id }).delete();
  return { ok: true };
}

/** Orden manual de hermanas: `orderedIds` en el orden en que deben quedar. */
export async function setCategoryOrder(tenantId: string, orderedIds: string[]): Promise<void> {
  const rows = await listCategories(tenantId);
  const known = new Set(rows.map((r) => r.id));
  let position = 0;
  for (const id of orderedIds) {
    if (!known.has(id)) continue;
    await db.orm.public.ProductCategory.where({ tenantId, id }).update({ position: position++ });
  }
}

/** Pone o quita la categoría a varios productos de una vez (siempre del negocio). */
export async function assignCategory(tenantId: string, productIds: string[], categoryId: string | null): Promise<{ ok: true; changed: number } | { ok: false; message: string }> {
  let name: string | null = null;
  if (categoryId) {
    const cat = await db.orm.public.ProductCategory.where({ tenantId, id: categoryId }).first();
    if (!cat) return { ok: false, message: "Esa categoría ya no existe." };
    name = cat.name;
  }
  const ids = [...new Set(productIds)].slice(0, 500);
  const valid = ids.length ? await db.orm.public.Product.where({ tenantId }).where((p) => p.id.in(ids)).select("id").all() : [];
  for (const p of valid) await db.orm.public.Product.where({ tenantId, id: p.id }).update({ categoryId, category: name });
  return { ok: true, changed: valid.length };
}
