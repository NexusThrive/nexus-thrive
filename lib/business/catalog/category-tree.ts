/**
 * Árbol de categorías de productos (puro). Dos niveles, como el formulario de referencia: categoría y subcategoría. Lo usan la
 * pantalla de categorías, el formulario de producto, el POS y los filtros; la base solo guarda `parentId`.
 */
export type CategoryRow = { id: string; name: string; parentId: string | null; position: number; products: number };
export type CategoryNode = CategoryRow & { children: CategoryRow[]; /** Productos de la categoría y de sus subcategorías. */ total: number };

export const MAX_CATEGORY_DEPTH = 2;

const byOrder = (a: CategoryRow, b: CategoryRow) => a.position - b.position || a.name.localeCompare(b.name, "es");

/** Categorías de primer nivel con sus subcategorías, en orden manual y luego alfabético. */
export function buildCategoryTree(rows: CategoryRow[]): CategoryNode[] {
  const children = new Map<string, CategoryRow[]>();
  for (const row of rows) if (row.parentId) children.set(row.parentId, [...(children.get(row.parentId) ?? []), row]);
  return rows
    .filter((row) => !row.parentId)
    .sort(byOrder)
    .map((row) => {
      const kids = (children.get(row.id) ?? []).sort(byOrder);
      return { ...row, children: kids, total: row.products + kids.reduce((sum, k) => sum + k.products, 0) };
    });
}

/** «Ropa › Camisetas»; si falta la madre o es de primer nivel, solo el nombre. */
export function categoryPath(rows: CategoryRow[], id: string | null | undefined): string {
  const row = rows.find((r) => r.id === id);
  if (!row) return "";
  const parent = row.parentId ? rows.find((r) => r.id === row.parentId) : null;
  return parent ? `${parent.name} › ${row.name}` : row.name;
}

/** Ids de una categoría y de todas sus subcategorías (para filtrar productos por una categoría madre). */
export function categoryAndChildren(rows: CategoryRow[], id: string): string[] {
  return [id, ...rows.filter((r) => r.parentId === id).map((r) => r.id)];
}

export type CategoryCheck = { ok: true } | { ok: false; message: string };

/** ¿Se puede poner esta categoría bajo `parentId`? Máximo dos niveles, sin ciclos y sin repetir el nombre entre hermanas. */
export function checkCategoryParent(rows: CategoryRow[], input: { id?: string; name: string; parentId: string | null }): CategoryCheck {
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Escribe el nombre de la categoría." };
  if (input.parentId) {
    const parent = rows.find((r) => r.id === input.parentId);
    if (!parent) return { ok: false, message: "La categoría madre ya no existe." };
    if (parent.parentId) return { ok: false, message: "Solo hay dos niveles: categoría y subcategoría." };
    if (input.id) {
      if (parent.id === input.id) return { ok: false, message: "Una categoría no puede ir dentro de sí misma." };
      if (rows.some((r) => r.parentId === input.id)) return { ok: false, message: "Esta categoría tiene subcategorías: no puede volverse subcategoría." };
    }
  }
  const twin = rows.find((r) => r.id !== input.id && (r.parentId ?? null) === input.parentId && r.name.trim().toLowerCase() === name.toLowerCase());
  if (twin) return { ok: false, message: "Ya existe una categoría con ese nombre en este lugar." };
  return { ok: true };
}
