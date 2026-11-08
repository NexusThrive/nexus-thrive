"use server";

import { revalidatePath } from "next/cache";
import { deleteAttribute, saveAttribute, type AttributeInput } from "@/lib/business/catalog/attributes-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";

/** Atributos de producto (Talla, Color…): solo quien gerencia el negocio los cambia. */
export type AttributeActionResult = { ok: true; message?: string } | { ok: false; message: string };

async function context(slug: string) {
  const ctx = await requireTenantContext(slug, "/inventario/atributos");
  return ctx && canManage(ctx.role) ? ctx : null;
}
const refresh = (slug: string) => {
  revalidatePath(`/${slug}/inventario/atributos`);
  revalidatePath(`/${slug}/inventario/productos`);
};

export async function saveAttributeAction(slug: string, input: AttributeInput): Promise<AttributeActionResult> {
  const ctx = await context(slug);
  if (!ctx) return { ok: false, message: "Tu rol no permite cambiar los atributos." };
  const result = await saveAttribute(ctx.tenantId, input);
  if (!result.ok) return result;
  refresh(slug);
  return { ok: true, message: input.id ? "Atributo actualizado" : "Atributo creado" };
}

export async function deleteAttributeAction(slug: string, id: string): Promise<AttributeActionResult> {
  const ctx = await context(slug);
  if (!ctx) return { ok: false, message: "Tu rol no permite cambiar los atributos." };
  await deleteAttribute(ctx.tenantId, id);
  refresh(slug);
  return { ok: true, message: "Atributo eliminado" };
}
