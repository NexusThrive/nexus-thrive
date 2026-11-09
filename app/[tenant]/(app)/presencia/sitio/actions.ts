"use server";

import { revalidatePath } from "next/cache";
import { getAppBaseUrl } from "@/lib/foundation/app-url";
import { can } from "@/lib/core/auth/permissions";
import { adoptAsWebsite, saveSite, setPublished, type SiteInput } from "@/lib/experience/site/site-db";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { addAttachment, checkAttachment } from "@/lib/business/sales/finance-db";
import { setRegistrationEnabled, setTenantLogo } from "@/lib/business/customers/registration-db";
import { profileFor } from "@/lib/business/customers/customer-fields";

export type SiteResult = { ok: true; message: string } | { ok: false; message: string; field?: string };

export async function saveSiteAction(slug: string, input: SiteInput, publishedIds: string[]): Promise<SiteResult> {
  const ctx = await requireTenantContext(slug, "/presencia/sitio");
  if (!ctx || !can(ctx.role, "business.manage")) return { ok: false, message: "Solo el dueño o administración edita el sitio." };
  const r = await saveSite(ctx.tenantId, input);
  if (!r.ok) return r;
  const changed = await setPublished(ctx.tenantId, publishedIds);
  // Publicado: el sitio pasa a ser el que verifica el escaneo de Presencia (si el negocio no tenía otro).
  if (input.enabled) await adoptAsWebsite(ctx.tenantId, `${await getAppBaseUrl()}/s/${input.siteSlug}`);
  await logTenantAction(ctx, "BIZ_SITE", { enabled: input.enabled, template: input.template, siteSlug: input.siteSlug, productsChanged: changed });
  revalidatePath(`/${slug}/presencia/sitio`);
  revalidatePath(`/s/${input.siteSlug}`);
  return { ok: true, message: input.enabled ? "Sitio guardado y publicado" : "Sitio guardado (sin publicar)" };
}

export type RegistrationSettingsResult =
  | { ok: true; message: string; logoId?: string | null }
  | { ok: false; message: string };

/** Enciende o apaga el enlace público de registro de clientes (solo gimnasio). */
export async function saveRegistrationSettingsAction(
  slug: string,
  enabled: boolean,
): Promise<RegistrationSettingsResult> {
  const ctx = await requireTenantContext(slug, "/presencia/sitio");
  if (!ctx || !can(ctx.role, "business.manage")) {
    return { ok: false, message: "Solo el dueño o administración configura el registro." };
  }
  if (!profileFor(ctx.vertical).planOnCreate) return { ok: false, message: "El registro público es del gimnasio." };
  await setRegistrationEnabled(ctx.tenantId, enabled);
  await logTenantAction(ctx, "BIZ_REGISTRATION", { enabled });
  revalidatePath(`/${slug}/presencia/sitio`);
  revalidatePath(`/registro/${slug}`);
  return { ok: true, message: enabled ? "Registro público activado" : "Registro público desactivado" };
}

/** Sube (o reemplaza) el logotipo que se muestra en el registro público. */
export async function uploadTenantLogoAction(slug: string, formData: FormData): Promise<RegistrationSettingsResult> {
  const ctx = await requireTenantContext(slug, "/presencia/sitio");
  if (!ctx || !can(ctx.role, "business.manage")) {
    return { ok: false, message: "Solo el dueño o administración cambia el logotipo." };
  }
  if (!profileFor(ctx.vertical).planOnCreate) return { ok: false, message: "El registro público es del gimnasio." };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Elige una imagen (JPG, PNG o WEBP)." };
  const invalid = checkAttachment(file);
  if (invalid) return { ok: false, message: invalid };
  if (!file.type.startsWith("image/")) return { ok: false, message: "El logotipo debe ser una imagen." };

  const logoId = await addAttachment(ctx.tenantId, "TENANT_LOGO", ctx.tenantId, file, ctx.memberId);
  await setTenantLogo(ctx.tenantId, logoId);
  await logTenantAction(ctx, "BIZ_REGISTRATION", { logoChanged: true });
  revalidatePath(`/${slug}/presencia/sitio`);
  revalidatePath(`/registro/${slug}`);
  return { ok: true, message: "Logotipo actualizado", logoId };
}
