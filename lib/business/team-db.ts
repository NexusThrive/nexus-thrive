import { db } from "@/prisma/db";
import { loadPricingConfig } from "@/lib/plans/settings";
import type { BusinessRole } from "./roles";

/**
 * Equipo de un negocio (servidor): invitaciones por correo, roles, retiro
 * (sin borrar el historial) y el límite de usuarios del plan.
 */

const now = () => Temporal.Instant.fromEpochMilliseconds(Date.now());
const INVITE_DAYS = 14;

export type TeamMember = { id: string; name: string; email: string; role: BusinessRole; title: string | null; phone: string | null; active: boolean; isMe: boolean; createdAt: string };
export type PendingInvite = { id: string; email: string; name: string | null; role: BusinessRole; createdAt: string; expiresAt: string };

export async function listTeam(tenantId: string, meId: string) {
  const [users, invites] = await Promise.all([
    db.orm.public.User.where({ tenantId }).orderBy((u) => u.createdAt.asc()).all(),
    db.orm.public.TenantInvite.where({ tenantId }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).orderBy((i) => i.createdAt.desc()).all(),
  ]);
  const live = invites.filter((i) => Date.parse(String(i.expiresAt)) > Date.now());
  return {
    members: users.map((u): TeamMember => ({ id: u.id, name: u.name ?? u.email, email: u.email, role: u.role as BusinessRole, title: u.title, phone: u.phone, active: u.active, isMe: u.id === meId, createdAt: String(u.createdAt) })),
    invites: live.map((i): PendingInvite => ({ id: i.id, email: i.email, name: i.name, role: i.role as BusinessRole, createdAt: String(i.createdAt), expiresAt: String(i.expiresAt) })),
  };
}

/** Usuarios que permite el plan del negocio (null = sin límite). */
export async function seatLimit(tenantId: string): Promise<{ limit: number | null; used: number; planName: string }> {
  const [t, config, active, pending] = await Promise.all([
    db.orm.public.Tenant.where({ id: tenantId }).select("plan").first(),
    loadPricingConfig(),
    db.orm.public.User.where({ tenantId, active: true }).where((u) => u.role.neq("SUPERADMIN")).aggregate((a) => ({ n: a.count() })),
    db.orm.public.TenantInvite.where({ tenantId }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).where((i) => i.expiresAt.gt(now())).aggregate((a) => ({ n: a.count() })),
  ]);
  const plan = await db.orm.public.PlanSetting.where({ key: t?.plan ?? "ESSENTIAL" }).select("maxUsers", "name").first();
  void config;
  return { limit: plan?.maxUsers ?? null, used: active.n + pending.n, planName: plan?.name ?? t?.plan ?? "" };
}

export async function createInvite(tenantId: string, v: { email: string; name: string | null; role: BusinessRole }, invitedById: string) {
  const expires = Temporal.Instant.fromEpochMilliseconds(Date.now() + INVITE_DAYS * 86_400_000);
  // Reemplaza una invitación pendiente al mismo correo.
  await db.orm.public.TenantInvite.where({ tenantId, email: v.email }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).update({ revokedAt: now() });
  return (await db.orm.public.TenantInvite.create({ tenantId, email: v.email, name: v.name, role: v.role, invitedById, expiresAt: expires })).id;
}

export async function revokeInvite(tenantId: string, id: string) {
  await db.orm.public.TenantInvite.where({ tenantId, id }).update({ revokedAt: now() });
}

/**
 * Acepta las invitaciones pendientes de un correo: crea (o reactiva) su
 * usuario en cada negocio que lo invitó. Devuelve los slugs.
 */
export async function acceptInvitesFor(clerkUserId: string, email: string, name: string | null, onlyTenantId?: string): Promise<string[]> {
  const mail = email.trim().toLowerCase();
  if (!mail) return [];
  let q = db.orm.public.TenantInvite.where({ email: mail }).where((i) => i.acceptedAt.isNull()).where((i) => i.revokedAt.isNull()).where((i) => i.expiresAt.gt(now()));
  if (onlyTenantId) q = q.where({ tenantId: onlyTenantId });
  const invites = await q.all();
  const slugs: string[] = [];
  for (const inv of invites) {
    const existing = await db.orm.public.User.where({ tenantId: inv.tenantId, clerkUserId }).first();
    if (existing) await db.orm.public.User.where({ tenantId: inv.tenantId, id: existing.id }).update({ active: true, removedAt: null, role: inv.role });
    else await db.orm.public.User.create({ tenantId: inv.tenantId, clerkUserId, email: mail, name: inv.name ?? name, role: inv.role });
    await db.orm.public.TenantInvite.where({ tenantId: inv.tenantId, id: inv.id }).update({ acceptedAt: now() });
    const t = await db.orm.public.Tenant.where({ id: inv.tenantId }).select("slug").first();
    if (t) slugs.push(t.slug);
  }
  return slugs;
}

export async function activeOwners(tenantId: string) {
  return (await db.orm.public.User.where({ tenantId, role: "OWNER", active: true }).aggregate((a) => ({ n: a.count() }))).n;
}

export async function setMemberRole(tenantId: string, userId: string, role: BusinessRole) {
  await db.orm.public.User.where({ tenantId, id: userId }).update({ role });
}

export async function setMemberActive(tenantId: string, userId: string, active: boolean) {
  await db.orm.public.User.where({ tenantId, id: userId }).update({ active, removedAt: active ? null : now() });
}

export async function updateMemberProfile(tenantId: string, userId: string, v: { name?: string; title?: string | null; phone?: string | null }) {
  await db.orm.public.User.where({ tenantId, id: userId }).update(v);
}

/** ¿Ya hay un integrante activo con ese correo en el negocio? */
export async function activeMemberWithEmail(tenantId: string, email: string): Promise<boolean> {
  return (await db.orm.public.User.where({ tenantId, email, active: true }).select("id").first()) !== null;
}

/** Rol y estado de un integrante del negocio (`null` si no es de este negocio). */
export async function memberRoleOf(tenantId: string, userId: string) {
  return db.orm.public.User.where({ tenantId, id: userId }).select("role", "active").first();
}

/** ¿`userId` es integrante (activo o no) de este negocio? */
export async function isTeamMember(tenantId: string, userId: string): Promise<boolean> {
  return (await db.orm.public.User.where({ tenantId, id: userId }).select("id").first()) !== null;
}
