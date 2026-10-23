"use server";

import { revalidatePath } from "next/cache";
import { cancelMembership, ensureAccessCode, freezeMembership, linkNfc, unfreezeMembership } from "@/lib/business/gym-db";
import { canHandleCash, canManage } from "@/lib/business/roles";
import { requireTenantContext } from "@/lib/tenant/context";

export type AccessActionResult = { ok: true; message?: string; code?: string } | { ok: false; message: string };
const DENIED: AccessActionResult = { ok: false, message: "Tu rol no permite esta acción." };

function refresh(slug: string, customerId?: string) {
  if (customerId) revalidatePath(`/${slug}/crm/${customerId}`);
  revalidatePath(`/${slug}/memberships`);
  revalidatePath(`/${slug}/checkin`);
}

/** Crea el código de acceso (QR) del socio o lo cambia si se perdió. */
export async function accessCodeAction(slug: string, customerId: string, regenerate: boolean): Promise<AccessActionResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx || !canHandleCash(ctx.role)) return DENIED;
  const code = await ensureAccessCode(ctx.tenantId, customerId, regenerate);
  if (!code) return { ok: false, message: "El cliente no es de este negocio." };
  refresh(slug, customerId);
  return { ok: true, code, message: regenerate ? "Código nuevo: el QR anterior ya no sirve." : "Código creado" };
}

export async function linkNfcAction(slug: string, customerId: string, uid: string | null): Promise<AccessActionResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx || !canHandleCash(ctx.role)) return DENIED;
  const r = await linkNfc(ctx.tenantId, customerId, uid);
  if (!r.ok) return r;
  refresh(slug, customerId);
  return { ok: true, message: uid ? "Tarjeta vinculada" : "Tarjeta desvinculada" };
}

// Congelar, reanudar y cancelar son del módulo de membresías (las usa su pantalla).
export async function freezeMembershipAction(slug: string, membershipId: string, fromDay: string, days: number): Promise<AccessActionResult> {
  const ctx = await requireTenantContext(slug, "/memberships");
  if (!ctx || !canHandleCash(ctx.role)) return DENIED;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(fromDay) ? Date.parse(`${fromDay}T00:00:00-05:00`) : NaN;
  if (!Number.isFinite(from)) return { ok: false, message: "Elige la fecha de inicio." };
  const r = await freezeMembership(ctx.tenantId, membershipId, Math.max(from, Date.now() - 60_000), days);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: `Congelada ${days} ${days === 1 ? "día" : "días"}: el vencimiento se corrió.` };
}

export async function unfreezeMembershipAction(slug: string, membershipId: string): Promise<AccessActionResult> {
  const ctx = await requireTenantContext(slug, "/memberships");
  if (!ctx || !canHandleCash(ctx.role)) return DENIED;
  const r = await unfreezeMembership(ctx.tenantId, membershipId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Membresía reactivada" };
}

export async function cancelMembershipAction(slug: string, membershipId: string, reason: string): Promise<AccessActionResult> {
  const ctx = await requireTenantContext(slug, "/memberships");
  if (!ctx || !canManage(ctx.role)) return { ok: false, message: "Solo el dueño o administración cancelan membresías." };
  if (reason.trim().length < 3) return { ok: false, message: "Escribe el motivo de la cancelación." };
  const r = await cancelMembership(ctx.tenantId, membershipId, reason.trim());
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Membresía cancelada" };
}
