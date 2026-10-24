"use server";

import { revalidatePath } from "next/cache";
import { connectGoogle, disconnectGoogle, syncGoogle } from "@/lib/google/google-db";
import { refreshPresence } from "@/lib/presence/pillars-db";
import { can } from "@/lib/business/permissions";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type GoogleResult = { ok: true; message: string } | { ok: false; message: string };
const manager = async (slug: string) => {
  const ctx = await requireTenantContext(slug, "/google");
  return ctx && can(ctx.role, "business.manage") ? ctx : null;
};
const done = async (slug: string, tenantId: string) => {
  await refreshPresence(tenantId);
  revalidatePath(`/${slug}/google`);
};

export async function connectGoogleAction(slug: string, placeId: string, apiKey: string): Promise<GoogleResult> {
  const ctx = await manager(slug);
  if (!ctx) return { ok: false, message: "Solo el dueño o administración conecta la ficha." };
  const c = await connectGoogle(ctx.tenantId, { placeId, apiKey });
  if (!c.ok) return c;
  const s = await syncGoogle(ctx.tenantId);
  await logTenantAction(ctx, "BIZ_GOOGLE", { action: "connect", synced: s.ok });
  await done(slug, ctx.tenantId);
  return s.ok ? { ok: true, message: "Ficha conectada y sincronizada" } : { ok: false, message: `Quedó conectada, pero ${s.message}` };
}

export async function syncGoogleAction(slug: string): Promise<GoogleResult> {
  const ctx = await manager(slug);
  if (!ctx) return { ok: false, message: "Solo el dueño o administración sincroniza la ficha." };
  const s = await syncGoogle(ctx.tenantId);
  await done(slug, ctx.tenantId);
  return s.ok ? { ok: true, message: "Ficha sincronizada" } : s;
}

export async function disconnectGoogleAction(slug: string): Promise<GoogleResult> {
  const ctx = await manager(slug);
  if (!ctx) return { ok: false, message: "Solo el dueño o administración desconecta la ficha." };
  await disconnectGoogle(ctx.tenantId);
  await logTenantAction(ctx, "BIZ_GOOGLE", { action: "disconnect" });
  await done(slug, ctx.tenantId);
  return { ok: true, message: "Ficha desconectada" };
}
