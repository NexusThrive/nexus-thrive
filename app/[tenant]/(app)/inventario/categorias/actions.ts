"use server";

import { revalidatePath } from "next/cache";
import { assignCategory, deleteCategory, saveCategory, setCategoryOrder } from "@/lib/business/catalog/categories-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";

/** Categorías de productos: solo quien gerencia el negocio las cambia (el servidor lo vuelve a exigir). */
export type CategoryActionResult = { ok: true; id?: string; message?: string } | { ok: false; message: string };
const DENIED: CategoryActionResult = { ok: false, message: "Tu rol no permite cambiar las categorías." };

async function context(slug: string) {
  const ctx = await requireTenantContext(slug, "/inventario/categorias");
  return ctx && canManage(ctx.role) ? ctx : null;
}
const refresh = (slug: string) => {
  revalidatePath(`/${slug}/inventario/categorias`);
  revalidatePath(`/${slug}/inventario/productos`);
};

export async function saveCategoryAction(slug: string, input: { id?: string; name: string; parentId: string | null }): Promise<CategoryActionResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await saveCategory(ctx.tenantId, input);
  if (result.ok) refresh(slug);
  return result.ok ? { ok: true, id: result.id, message: input.id ? "Categoría actualizada" : "Categoría creada" } : result;
}

export async function deleteCategoryAction(slug: string, id: string): Promise<CategoryActionResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await deleteCategory(ctx.tenantId, id);
  if (result.ok) refresh(slug);
  return result.ok ? { ok: true, message: "Categoría eliminada" } : result;
}

export async function reorderCategoriesAction(slug: string, orderedIds: string[]): Promise<CategoryActionResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  await setCategoryOrder(ctx.tenantId, orderedIds);
  refresh(slug);
  return { ok: true };
}

/** Pone una categoría (o ninguna) a varios productos a la vez, desde la lista. */
export async function assignCategoryAction(slug: string, productIds: string[], categoryId: string | null): Promise<CategoryActionResult> {
  const ctx = await context(slug);
  if (!ctx) return DENIED;
  const result = await assignCategory(ctx.tenantId, productIds, categoryId);
  if (!result.ok) return result;
  refresh(slug);
  return { ok: true, message: `${result.changed} ${result.changed === 1 ? "producto" : "productos"} actualizados` };
}
