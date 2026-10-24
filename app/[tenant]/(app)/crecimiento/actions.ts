"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/business/permissions";
import { createLink, handleReview, setLinkActive } from "@/lib/growth/growth-db";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type GrowthResult = { ok: true; message: string } | { ok: false; message: string };
const manager = async (slug: string) => {
  const ctx = await requireTenantContext(slug, "/crecimiento");
  return ctx && can(ctx.role, "business.manage") ? ctx : null;
};
const refresh = (slug: string) => revalidatePath(`/${slug}/crecimiento`);

export async function createLinkAction(slug: string, input: { name: string; utmSource: string; utmMedium: string; utmCampaign: string; spend: number }): Promise<GrowthResult> {
  const ctx = await manager(slug);
  if (!ctx) return { ok: false, message: "Solo el dueño o administración crea campañas." };
  const r = await createLink(ctx.tenantId, input);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_GROWTH", { action: "link.create", code: r.code });
  refresh(slug);
  return { ok: true, message: "Enlace de campaña creado" };
}

export async function toggleLinkAction(slug: string, id: string, active: boolean): Promise<GrowthResult> {
  const ctx = await manager(slug);
  if (!ctx) return { ok: false, message: "Solo el dueño o administración maneja las campañas." };
  if (!(await setLinkActive(ctx.tenantId, id, active))) return { ok: false, message: "No se encontró el enlace." };
  refresh(slug);
  return { ok: true, message: active ? "Enlace activado" : "Enlace apagado" };
}

export async function handleReviewAction(slug: string, id: string): Promise<GrowthResult> {
  const ctx = await manager(slug);
  if (!ctx) return { ok: false, message: "Solo el dueño o administración atiende las reseñas." };
  if (!(await handleReview(ctx.tenantId, id))) return { ok: false, message: "No se encontró la reseña." };
  await logTenantAction(ctx, "BIZ_GROWTH", { action: "review.handled", id });
  refresh(slug);
  return { ok: true, message: "Reseña marcada como atendida" };
}
