import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin-db";
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
      const invited = await loadMember({ email });
      if (invited && !invited.clerkUserId && invited.active) {
        await db.orm.public.StaffMember.where({ id: invited.id }).update({ clerkUserId: userId, joinedAt: now() });
        member = await loadMember({ clerkUserId: userId });
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
