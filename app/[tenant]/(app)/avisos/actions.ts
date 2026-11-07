"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/core/auth/permissions";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { collectNotices, processNotices, saveTemplate, setMetaStatus } from "@/lib/integrations/channels/notices-db";
import type { MetaStatus } from "@/lib/integrations/channels/notices";

export type NoticeResult = { ok: true; message: string } | { ok: false; message: string };
const refresh = (slug: string) => revalidatePath(`/${slug}/avisos`);

async function manager(slug: string) {
  const ctx = await requireTenantContext(slug, "/avisos");
  return ctx && can(ctx.role, "business.manage") ? ctx : null;
}
const DENIED: NoticeResult = { ok: false, message: "Solo el dueño o administración maneja las plantillas." };

export async function saveTemplateAction(slug: string, input: { key: string; title: string; body: string; event: string; enabled: boolean }): Promise<NoticeResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await saveTemplate(ctx.tenantId, { ...input, event: input.event || null });
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Plantilla guardada" };
}

export async function metaStatusAction(slug: string, id: string, status: string, metaName: string): Promise<NoticeResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await setMetaStatus(ctx.tenantId, id, status as MetaStatus, metaName);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Estado en Meta guardado" };
}

/** Convierte en avisos los hechos recientes y procesa los pendientes ahora (el cron lo hace solo cada pocos minutos). */
export async function sendPendingAction(slug: string): Promise<NoticeResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  await collectNotices(ctx.tenantId);
  const r = await processNotices(ctx.tenantId);
  refresh(slug);
  const parts = [r.sent ? `${r.sent} enviados` : "", r.manual ? `${r.manual} listos para enviar con un toque` : "", r.blocked ? `${r.blocked} bloqueados por baja` : "", r.failed ? `${r.failed} con error` : ""].filter(Boolean);
  return { ok: true, message: parts.length ? parts.join(" · ") : "No había avisos pendientes" };
}
