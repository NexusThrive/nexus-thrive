"use server";

import { revalidatePath } from "next/cache";
import { kindsForVertical } from "@/lib/business/catalog/catalog-kinds";
import { validateProductForm, type ProductFormDraft } from "@/lib/business/catalog/product-form";
import { saveProductForm, setProductImage, type SaveFormResult } from "@/lib/business/catalog/product-form-db";
import { addAttachment } from "@/lib/business/sales/finance-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Guarda el formulario de producto (datos, foto, categoría, atributos y variantes). Llega como FormData: `draft` (JSON) e `image`
 * (archivo, opcional). El servidor vuelve a validar todo y a comprobar el rol: lo que mande el navegador no se da por bueno.
 */
export async function saveProductFormAction(slug: string, id: string | null, form: FormData): Promise<SaveFormResult> {
  const ctx = await requireTenantContext(slug, "/inventario/productos");
  if (!ctx || !canManage(ctx.role)) return { ok: false, message: "Tu rol no permite cambiar el catálogo." };
  let draft: ProductFormDraft;
  try {
    draft = JSON.parse(String(form.get("draft") ?? "")) as ProductFormDraft;
  } catch {
    return { ok: false, message: "No se pudieron leer los datos del formulario." };
  }
  if (!kindsForVertical(ctx.vertical).includes(draft.kind)) return { ok: false, message: "Ese tipo no aplica a tu rubro." };
  const checked = validateProductForm(draft);
  if (!checked.ok) return { ok: false, message: "Revisa los campos marcados.", errors: checked.errors };

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (!IMAGE_TYPES.includes(image.type)) return { ok: false, message: "La foto debe ser JPG, PNG o WebP.", errors: {} };
    if (image.size > MAX_IMAGE_BYTES) return { ok: false, message: "La foto pesa más de 5 MB.", errors: {} };
  }

  const saved = await saveProductForm(ctx.tenantId, id, draft, ctx.memberId);
  if (!saved.ok) return saved;
  let message = saved.message;
  if (image instanceof File && image.size > 0) {
    try {
      const fileId = await addAttachment(ctx.tenantId, "PRODUCT_IMAGE", saved.id, image, ctx.memberId);
      await setProductImage(ctx.tenantId, saved.id, `/api/files/${fileId}`);
    } catch (error) {
      message = `${message}, pero la foto no: ${error instanceof Error ? error.message : "inténtalo de nuevo"}`;
    }
  }
  revalidatePath(`/${slug}/inventario/productos`);
  revalidatePath(`/${slug}/inventario/categorias`);
  revalidatePath(`/${slug}/pos`);
  return { ...saved, message };
}
