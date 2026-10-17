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
