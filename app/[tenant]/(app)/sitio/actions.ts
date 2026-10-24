"use server";

import { revalidatePath } from "next/cache";
import { getAppBaseUrl } from "@/lib/app-url";
import { can } from "@/lib/business/permissions";
import { adoptAsWebsite, saveSite, setPublished, type SiteInput } from "@/lib/site/site-db";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type SiteResult = { ok: true; message: string } | { ok: false; message: string; field?: string };

export async function saveSiteAction(slug: string, input: SiteInput, publishedIds: string[]): Promise<SiteResult> {
  const ctx = await requireTenantContext(slug, "/sitio");
  if (!ctx || !can(ctx.role, "business.manage")) return { ok: false, message: "Solo el dueño o administración edita el sitio." };
  const r = await saveSite(ctx.tenantId, input);
  if (!r.ok) return r;
  const changed = await setPublished(ctx.tenantId, publishedIds);
  // Publicado: el sitio pasa a ser el que verifica el escaneo de Presencia (si el negocio no tenía otro).
  if (input.enabled) await adoptAsWebsite(ctx.tenantId, `${await getAppBaseUrl()}/s/${input.siteSlug}`);
  await logTenantAction(ctx, "BIZ_SITE", { enabled: input.enabled, template: input.template, siteSlug: input.siteSlug, productsChanged: changed });
  revalidatePath(`/${slug}/sitio`);
  revalidatePath(`/s/${input.siteSlug}`);
  return { ok: true, message: input.enabled ? "Sitio guardado y publicado" : "Sitio guardado (sin publicar)" };
}
