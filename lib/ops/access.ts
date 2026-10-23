import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { OWNER_ROLE_KEY, SYSTEM_ROLES, normalizePermissions, type PermissionKey } from "./permissions";

/**
 * Acceso al NEXUS Operations Center. Toda página y toda acción del panel
 * pasa por aquí: sesión de Clerk + integrante activo del equipo NEXUS +
 * (opcional) un permiso concreto. Nada se decide en el navegador.
 */

export type StaffContext = {
  staffId: string;
  clerkUserId: string;
  email: string;
  name: string | null;
  roleKey: string;
  roleName: string;
  permissions: PermissionKey[];
};

const SEEN_EVERY_MS = 5 * 60_000;
const now = () => Temporal.Instant.fromEpochMilliseconds(Date.now());

/** Crea los roles base que falten (idempotente). Nunca pisa permisos editados. */
export async function ensureSystemRoles(): Promise<void> {
  for (const role of SYSTEM_ROLES) {
    const existing = await db.orm.public.StaffRole.where({ key: role.key }).first();
    if (!existing) {
      await db.orm.public.StaffRole.create({
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        system: true,
      });
    } else if (role.key === OWNER_ROLE_KEY) {
      // El Propietario siempre conserva todos los permisos (aunque el catálogo crezca).
      await db.orm.public.StaffRole.where({ id: existing.id }).update({ permissions: role.permissions });
    }
  }
}

async function primaryEmail(): Promise<string | null> {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
  return email ? email.trim().toLowerCase() : null;
}

async function loadMember(where: { clerkUserId: string } | { email: string }) {
  return db.orm.public.StaffMember.where(where)
    .include("role", (role) => role.select("key", "name", "permissions"))
    .first();
}

/** Ficha del equipo por correo, sin efectos secundarios (no vincula nada). */
export type StaffByEmail = {
  id: string;
  email: string;
  name: string | null;
  roleName: string;
  active: boolean;
  /** Ya está vinculada a una cuenta de Clerk (posiblemente otra). */
  linked: boolean;
};

/**
 * Busca la ficha del equipo por correo. Solo lee: no vincula ni concede
 * acceso. Sirve para explicarle a la persona qué está pasando cuando su
 * correo está en el equipo pero no puede entrar al panel.
 */
export async function findStaffByEmail(email: string): Promise<StaffByEmail | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const row = await db.orm.public.StaffMember
    .where((s) => s.email.ilike(clean))
    .include("role", (role) => role.select("name"))
    .first();
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: row.name == null ? null : String(row.name),
    roleName: row.role?.name ?? "Integrante",
    active: Boolean(row.active),
    linked: Boolean(row.clerkUserId),
  };
}

/**
 * Vincula una ficha del equipo con la cuenta de Clerk de esta sesión.
 * Devuelve el motivo si no se pudo (para poder explicarlo).
 */
export async function linkStaffToSession(
  email: string,
  clerkUserId: string,
): Promise<{ ok: true } | { ok: false; reason: "inactive" | "other_account" | "not_found" }> {
  const staff = await findStaffByEmail(email);
  if (!staff) return { ok: false, reason: "not_found" };
  if (!staff.active) return { ok: false, reason: "inactive" };
  if (staff.linked) return { ok: false, reason: "other_account" };
  await db.orm.public.StaffMember
    .where({ id: staff.id })
    .update({ clerkUserId, joinedAt: now() });
  return { ok: true };
}

/**
 * Integrante del equipo para la sesión actual, o `null`:
 * 1. Por `clerkUserId`.
 * 2. Invitación pendiente: mismo correo, aún sin cuenta vinculada → se vincula.
 * 3. Primera vez del panel: si no hay equipo y la sesión es el SUPERADMIN
 *    heredado, se crean los roles base y queda como Propietario.
 */
export async function getStaffContext(): Promise<StaffContext | null> {
  const { userId } = await auth();
  if (!userId) return null;

  let member = await loadMember({ clerkUserId: userId });

  if (!member) {
    const email = await primaryEmail();
    if (email) {
      // Vinculación por correo: la ficha pendiente (mismo correo, sin cuenta
      // aún) se engancha a esta sesión. Si está pausada o ya pertenece a otra
      // cuenta, NO se vincula (eso lo explica el callback con un aviso).
      const linked = await linkStaffToSession(email, userId);
      if (linked.ok) {
        member = await loadMember({ clerkUserId: userId });
        if (member) {
          try {
            await createAdminDb().logAudit({
              actorId: userId,
              actorEmail: email,
              action: "STAFF_INVITE",
              targetTenantId: null,
              targetTenantName: null,
              metadata: { email, event: "linked", roleId: member.roleId },
            });
          } catch {
            // La auditoría nunca rompe el acceso.
          }
        }
      }
    }
  }

  if (!member) {
    const { total } = await db.orm.public.StaffMember.aggregate((a) => ({ total: a.count() }));
    if (total === 0 && (await createAdminDb().isSuperAdmin(userId))) {
      await ensureSystemRoles();
      const owner = await db.orm.public.StaffRole.where({ key: OWNER_ROLE_KEY }).first();
      const email = (await primaryEmail()) ?? `${userId}@clerk.local`;
      if (owner) {
        await db.orm.public.StaffMember.create({
          clerkUserId: userId,
          email,
          name: (await currentUser())?.fullName ?? null,
          title: "Fundador",
          roleId: owner.id,
          joinedAt: now(),
        });
        member = await loadMember({ clerkUserId: userId });
      }
    }
  }

  if (!member || !member.active || !member.role) return null;

  const seen = member.lastSeenAt ? Date.parse(String(member.lastSeenAt)) : 0;
  if (Date.now() - seen > SEEN_EVERY_MS) {
    await db.orm.public.StaffMember.where({ id: member.id }).update({ lastSeenAt: now() });
  }

  return {
    staffId: member.id,
    clerkUserId: userId,
    email: member.email,
    name: member.name,
    roleKey: member.role.key,
    roleName: member.role.name,
    permissions: normalizePermissions(member.role.permissions ?? []),
  };
}

/** Integrante con el permiso pedido (o cualquiera activo si no se pide), o `null`. */
export async function requireStaff(permission?: PermissionKey): Promise<StaffContext | null> {
  const ctx = await getStaffContext();
  if (!ctx) return null;
  if (permission && !ctx.permissions.includes(permission)) return null;
  return ctx;
}
