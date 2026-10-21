import { db } from "@/prisma/db";
import { OWNER_ROLE_KEY, normalizePermissions, type PermissionKey } from "./permissions";

/** Datos del equipo NEXUS para el panel (solo valores serializables). */

export type StaffRow = {
  id: string;
  email: string;
  name: string | null;
  title: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  active: boolean;
  /** Invitado que aún no entra (sin cuenta vinculada). */
  pending: boolean;
  /** Ya tiene una cuenta de Clerk vinculada (y por eso no es una invitación). */
  linked: boolean;
  lastSeenAt: string | null;
  createdAt: string;
};

export type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: PermissionKey[];
  system: boolean;
  members: number;
};

const iso = (v: unknown) => (v == null ? null : String(v));

export async function listStaff(): Promise<StaffRow[]> {
  const rows = await db.orm.public.StaffMember.include("role", (r) => r.select("key", "name"))
    .orderBy((m) => m.createdAt.asc())
    .all();
  return rows.map((m) => ({
    id: m.id,
    email: m.email,
    name: m.name,
    title: m.title,
    roleId: m.roleId,
    roleKey: m.role?.key ?? "",
    roleName: m.role?.name ?? "Sin rol",
    active: m.active,
    pending: !m.clerkUserId,
    linked: Boolean(m.clerkUserId),
    lastSeenAt: iso(m.lastSeenAt),
    createdAt: String(m.createdAt),
  }));
}

export async function listRoles(): Promise<RoleRow[]> {
  const [roles, members] = await Promise.all([
    db.orm.public.StaffRole.orderBy((r) => r.createdAt.asc()).all(),
    db.orm.public.StaffMember.where({ active: true }).select("roleId").all(),
  ]);
  const count = new Map<string, number>();
  for (const m of members) count.set(m.roleId, (count.get(m.roleId) ?? 0) + 1);
  return roles.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    permissions: normalizePermissions(r.permissions ?? []),
    system: r.system,
    members: count.get(r.id) ?? 0,
  }));
}

export async function getRole(id: string) {
  return db.orm.public.StaffRole.where({ id }).first();
}

export async function getMember(id: string) {
  return db.orm.public.StaffMember.where({ id }).include("role", (r) => r.select("key", "name")).first();
}

/** Propietarios activos (para no dejar el panel sin dueño). */
export async function activeOwnerCount(): Promise<number> {
  const owner = await db.orm.public.StaffRole.where({ key: OWNER_ROLE_KEY }).first();
  if (!owner) return 0;
  const { total } = await db.orm.public.StaffMember.where({ roleId: owner.id, active: true }).aggregate((a) => ({ total: a.count() }));
  return total;
}

export async function emailTaken(email: string): Promise<boolean> {
  return (await db.orm.public.StaffMember.where({ email }).first()) !== null;
}

export async function inviteStaff(input: { email: string; name: string | null; title: string | null; roleId: string; invitedById: string }) {
  return db.orm.public.StaffMember.create({ ...input, active: true });
}

export async function setStaffRole(id: string, roleId: string) {
  await db.orm.public.StaffMember.where({ id }).update({ roleId });
}

export async function setStaffActive(id: string, active: boolean) {
  await db.orm.public.StaffMember.where({ id }).update({ active });
}

/**
 * Suelta la cuenta de Clerk vinculada a la ficha. Sirve cuando la persona se
 * registró con otra cuenta (y por eso no puede entrar al panel): al desvincular,
 * la próxima vez que entre con cualquier cuenta de ese correo se vincula sola.
 */
export async function unlinkStaffAccount(id: string) {
  await db.orm.public.StaffMember.where({ id }).update({ clerkUserId: null, joinedAt: null });
}

export async function roleKeyTaken(key: string): Promise<boolean> {
  return (await db.orm.public.StaffRole.where({ key }).first()) !== null;
}

export async function createRole(input: { key: string; name: string; description: string | null; permissions: PermissionKey[] }) {
  return db.orm.public.StaffRole.create({ ...input, system: false });
}

export async function updateRole(id: string, input: { name: string; description: string | null; permissions: PermissionKey[] }) {
  await db.orm.public.StaffRole.where({ id }).update(input);
}

export async function deleteRole(id: string) {
  await db.orm.public.StaffRole.where({ id }).delete();
}

export async function roleMemberCount(id: string): Promise<number> {
  const { total } = await db.orm.public.StaffMember.where({ roleId: id }).aggregate((a) => ({ total: a.count() }));
  return total;
}

// ============================================================================
// Invitaciones al equipo (enlace de un solo uso)
// ============================================================================
// El alta por correo tiene un punto débil: si la persona se registra con otra
// cuenta, la ficha no se engancha y acaba creando un negocio por error. La
// invitación ata una cuenta concreta (por su Clerk user id) a la ficha, sin
// depender del correo con el que se registre.
//
// Todavía NO se envía por correo (falta RESEND_API_KEY): el panel genera el
// enlace para mandarlo a mano (WhatsApp, correo). Cuando haya Resend, el
// mismo enlace se manda solo.

/** Token de invitación: legible, sin caracteres problemáticos en una URL. */
export function inviteToken(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export type StaffInviteRow = {
  token: string;
  email: string;
  roleId: string;
  roleName: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

/** Crea una invitación para una ficha del equipo (o la renueva). */
export async function createStaffInvite(input: {
  memberId: string;
  createdById: string | null;
  days?: number;
}): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const member = await db.orm.public.StaffMember.where({ id: input.memberId }).first();
  if (!member) return { ok: false, message: "El integrante ya no existe." };

  const days = Math.min(Math.max(input.days ?? 7, 1), 30);
  const token = inviteToken();
  const expiresAt = Date.now() + days * 86_400_000;
  try {
    await db.orm.public.StaffInvite.create({
      token,
      email: String(member.email).toLowerCase(),
      roleId: String(member.roleId),
      createdById: input.createdById,
      expiresAt: Temporal.Instant.fromEpochMilliseconds(expiresAt),
    });
  } catch {
    return { ok: false, message: "No se pudo generar la invitación. Inténtalo de nuevo." };
  }
  return { ok: true, token };
}

/** Invitación vigente por token (sin usar). */
export async function getStaffInvite(token: string): Promise<StaffInviteRow | null> {
  const row = await db.orm.public.StaffInvite.where({ token })
    .include("role", (r) => r.select("name"))
    .first();
  if (!row) return null;
  return {
    token: String(row.token),
    email: String(row.email),
    roleId: String(row.roleId),
    roleName: row.role?.name ?? "Integrante",
    expiresAt: String(row.expiresAt),
    usedAt: row.usedAt == null ? null : String(row.usedAt),
    createdAt: String(row.createdAt),
  };
}

/**
 * Consume la invitación: ata la cuenta de Clerk a la ficha del integrante y
 * marca la invitación como usada. Si la ficha ya está vinculada a otra cuenta,
 * no se pisa (eso lo decide el equipo con "Desvincular cuenta").
 */
export async function redeemStaffInvite(
  token: string,
  clerkUserId: string,
): Promise<
  | { ok: true; email: string; roleName: string }
  | { ok: false; reason: "not_found" | "used" | "expired" | "other_account" | "inactive"; email?: string; roleName?: string }
> {
  const invite = await getStaffInvite(token);
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.usedAt) return { ok: false, reason: "used", email: invite.email, roleName: invite.roleName };
  if (Date.parse(invite.expiresAt) <= Date.now()) {
    return { ok: false, reason: "expired", email: invite.email, roleName: invite.roleName };
  }

  const member = await db.orm.public.StaffMember
    .where((s) => s.email.ilike(invite.email))
    .include("role", (r) => r.select("name"))
    .first();
  if (!member) return { ok: false, reason: "not_found", email: invite.email, roleName: invite.roleName };
  if (!member.active) {
    return { ok: false, reason: "inactive", email: invite.email, roleName: invite.roleName };
  }
  if (member.clerkUserId && member.clerkUserId !== clerkUserId) {
    return { ok: false, reason: "other_account", email: invite.email, roleName: invite.roleName };
  }

  if (!member.clerkUserId) {
    await db.orm.public.StaffMember
      .where({ id: member.id })
      .update({ clerkUserId, joinedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) });
  }
  await db.orm.public.StaffInvite
    .where({ token })
    .update({ usedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) });

  return { ok: true, email: invite.email, roleName: invite.roleName };
}
