"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { BUSINESS_ROLES, canManageTeam, type BusinessRole } from "@/lib/business/roles";
import { activeOwners, createInvite, revokeInvite, seatLimit, setMemberActive, setMemberRole, updateMemberProfile } from "@/lib/business/team-db";
import { requireTenantContext } from "@/lib/tenant/context";
import { logTenantAction } from "@/lib/tenant/audit";

export type TeamResult = { ok: true; message?: string } | { ok: false; message: string };
const DENIED: TeamResult = { ok: false, message: "Solo el dueño o administración maneja el equipo." };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLES = BUSINESS_ROLES.map((r) => r.value) as BusinessRole[];

async function ctxFor(slug: string) {
  const ctx = await requireTenantContext(slug);
  return ctx && canManageTeam(ctx.role) ? ctx : null;
}

function refresh(slug: string) {
  revalidatePath(`/${slug}/settings`);
}

export async function inviteMemberAction(slug: string, input: { email: string; name: string; role: string }): Promise<TeamResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return DENIED;
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, message: "Escribe un correo válido." };
  if (!ROLES.includes(input.role as BusinessRole)) return { ok: false, message: "Elige un rol." };
  if (input.role === "OWNER" && ctx.role !== "OWNER" && ctx.role !== "SUPERADMIN") return { ok: false, message: "Solo un dueño puede nombrar a otro dueño." };
  const existing = await db.orm.public.User.where({ tenantId: ctx.tenantId, email, active: true }).select("id").first();
  if (existing) return { ok: false, message: "Esa persona ya es parte del equipo." };
  const seats = await seatLimit(ctx.tenantId);
  if (seats.limit != null && seats.used >= seats.limit) return { ok: false, message: `Tu plan ${seats.planName} incluye ${seats.limit} ${seats.limit === 1 ? "usuario" : "usuarios"}. Mejora tu plan para sumar más personas.` };
  await createInvite(ctx.tenantId, { email, name: input.name.trim().slice(0, 80) || null, role: input.role as BusinessRole }, ctx.memberId);
  await logTenantAction(ctx, "BIZ_MEMBER_INVITE", { email, role: input.role });
  refresh(slug);
  return { ok: true, message: `Invitación enviada a ${email}. Entra con ese correo en NEXUS y queda en tu equipo.` };
}

export async function revokeInviteAction(slug: string, id: string): Promise<TeamResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return DENIED;
  await revokeInvite(ctx.tenantId, id);
  await logTenantAction(ctx, "BIZ_INVITE_REVOKE", { inviteId: id });
  refresh(slug);
  return { ok: true, message: "Invitación cancelada" };
}

export async function changeMemberRoleAction(slug: string, userId: string, role: string): Promise<TeamResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return DENIED;
  if (userId === ctx.memberId) return { ok: false, message: "No puedes cambiar tu propio rol." };
  if (!ROLES.includes(role as BusinessRole)) return { ok: false, message: "Rol no válido." };
  const u = await db.orm.public.User.where({ tenantId: ctx.tenantId, id: userId }).select("role", "active").first();
  if (!u) return { ok: false, message: "No es parte del equipo." };
  if (u.role === "SUPERADMIN") return { ok: false, message: "El soporte de NEXUS no se modifica." };
  if ((role === "OWNER" || u.role === "OWNER") && ctx.role !== "OWNER" && ctx.role !== "SUPERADMIN") return { ok: false, message: "Solo un dueño cambia a otro dueño." };
  if (u.role === "OWNER" && role !== "OWNER" && (await activeOwners(ctx.tenantId)) <= 1) return { ok: false, message: "El negocio no puede quedarse sin dueño." };
  await setMemberRole(ctx.tenantId, userId, role as BusinessRole);
  await logTenantAction(ctx, "BIZ_MEMBER_ROLE", { userId, from: u.role, to: role });
  refresh(slug);
  return { ok: true, message: "Rol actualizado" };
}

export async function setMemberActiveAction(slug: string, userId: string, active: boolean): Promise<TeamResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return DENIED;
  if (userId === ctx.memberId) return { ok: false, message: "No puedes retirarte a ti mismo." };
  const u = await db.orm.public.User.where({ tenantId: ctx.tenantId, id: userId }).select("role", "active").first();
  if (!u) return { ok: false, message: "No es parte del equipo." };
  if (u.role === "SUPERADMIN") return { ok: false, message: "El soporte de NEXUS no se modifica." };
  if (!active && u.role === "OWNER") {
    if (ctx.role !== "OWNER" && ctx.role !== "SUPERADMIN") return { ok: false, message: "Solo un dueño retira a otro dueño." };
    if ((await activeOwners(ctx.tenantId)) <= 1) return { ok: false, message: "El negocio no puede quedarse sin dueño." };
  }
  if (active) {
    const seats = await seatLimit(ctx.tenantId);
    if (seats.limit != null && seats.used >= seats.limit) return { ok: false, message: `Tu plan ${seats.planName} ya usa sus ${seats.limit} usuarios.` };
  }
  await setMemberActive(ctx.tenantId, userId, active);
  await logTenantAction(ctx, "BIZ_MEMBER_ACTIVE", { userId, active });
  refresh(slug);
  return { ok: true, message: active ? "Reactivado" : "Retirado del equipo: ya no puede entrar. Su historial se conserva." };
}

/** Cada persona edita cómo aparece: su nombre (el del saludo), cargo y teléfono. */
export async function updateMyProfileAction(slug: string, input: { name: string; title: string; phone: string }): Promise<TeamResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, message: "Escribe tu nombre." };
  await updateMemberProfile(ctx.tenantId, ctx.memberId, { name: name.slice(0, 80), title: input.title.trim().slice(0, 60) || null, phone: input.phone.trim().slice(0, 30) || null });
  refresh(slug);
  revalidatePath(`/${slug}`);
  return { ok: true, message: "Tu perfil se actualizó" };
}
