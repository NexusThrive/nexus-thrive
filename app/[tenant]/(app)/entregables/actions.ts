"use server";

import { revalidatePath } from "next/cache";
import { createDeliverable, addDeliverableFile, sendForReview } from "@/lib/business/customers/deliverables-db";
import { getAppBaseUrl } from "@/lib/foundation/app-url";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type DeliverableResult = { ok: true; message: string; link?: string } | { ok: false; message: string; field?: string };
const NO_ACCESS: DeliverableResult = { ok: false, message: "No tienes acceso a este negocio." };
const refresh = (slug: string) => revalidatePath(`/${slug}/entregables`);

export async function createDeliverableAction(slug: string, input: { title: string; description: string; projectId: string; customerId: string }): Promise<DeliverableResult> {
  const ctx = await requireTenantContext(slug, "/entregables");
  if (!ctx) return NO_ACCESS;
  const r = await createDeliverable(ctx.tenantId, { title: input.title, description: input.description, projectId: input.projectId || null, customerId: input.customerId || null }, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Entregable creado" };
}

/** Sube un archivo (el formulario envía el `File` en `file`). */
export async function uploadDeliverableFileAction(slug: string, id: string, formData: FormData): Promise<DeliverableResult> {
  const ctx = await requireTenantContext(slug, "/entregables");
  if (!ctx) return NO_ACCESS;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Elige un archivo.", field: "file" };
  const r = await addDeliverableFile(ctx.tenantId, id, file, ctx.memberId);
  if (!r.ok) return { ...r, field: "file" };
  refresh(slug);
  return { ok: true, message: "Archivo agregado" };
}

/** Envía a revisión y devuelve el enlace para el cliente (se muestra una sola vez). */
export async function sendDeliverableAction(slug: string, id: string): Promise<DeliverableResult> {
  const ctx = await requireTenantContext(slug, "/entregables");
  if (!ctx) return NO_ACCESS;
  const r = await sendForReview(ctx.tenantId, id);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Listo para enviar al cliente", link: `${await getAppBaseUrl()}/entregable/${r.token}` };
}
