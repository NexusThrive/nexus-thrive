"use server";

import { revalidatePath } from "next/cache";
import { addAttachment } from "@/lib/business/sales/finance-db";
import { setCustomerPhoto } from "@/lib/business/customers/customers-db";
import { EMPTY_NEW_CUSTOMER, type NewCustomerInput } from "@/lib/business/customers/new-customer";
import { createFullCustomer, findCustomerByContact, updateFullCustomer } from "@/lib/business/customers/new-customer-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type NewCustomerActionResult = { ok: true; id: string; message: string } | { ok: false; message: string; errors?: Partial<Record<keyof NewCustomerInput, string>> };

/** Crea el cliente completo desde «Nuevo cliente», o lo actualiza si viene `id` (edición desde la ficha). La foto viaja en `photo`; los datos, en `data` (JSON). */
export async function createNewCustomerAction(form: FormData): Promise<NewCustomerActionResult> {
  const slug = String(form.get("slug") ?? "");
  const ctx = await requireTenantContext(slug, "/contactos");
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  let input: NewCustomerInput;
  try {
    input = { ...EMPTY_NEW_CUSTOMER, ...(JSON.parse(String(form.get("data") ?? "{}")) as Partial<NewCustomerInput>) };
  } catch {
    return { ok: false, message: "No se pudieron leer los datos del formulario." };
  }
  // Con `id` es la edición desde la ficha (?editar=1); sin `id`, un alta.
  const editId = String(form.get("id") ?? "");
  const r = editId ? await updateFullCustomer(ctx.tenantId, editId, input) : await createFullCustomer(ctx.tenantId, input, ctx.memberId);
  if (!r.ok) return r;
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      const photoId = await addAttachment(ctx.tenantId, "CUSTOMER_PHOTO", r.id, photo, ctx.memberId);
      await setCustomerPhoto(ctx.tenantId, r.id, photoId);
    } catch (error) {
      return { ok: true, id: r.id, message: `Cliente guardado, pero la foto no: ${error instanceof Error ? error.message : "intenta subirla desde la ficha"}` };
    }
  }
  revalidatePath(`/${slug}/contactos`);
  if (editId) revalidatePath(`/${slug}/contactos/${editId}`);
  return { ok: true, id: r.id, message: editId ? "Cambios guardados" : "Cliente guardado" };
}

/** Aviso de posible duplicado al salir del teléfono o del correo. No bloquea el alta. */
export async function checkDuplicateAction(slug: string, probe: { phone?: string; email?: string }) {
  const ctx = await requireTenantContext(slug, "/contactos");
  if (!ctx) return null;
  return findCustomerByContact(ctx.tenantId, probe);
}
