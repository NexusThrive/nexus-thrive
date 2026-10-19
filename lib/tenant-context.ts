import { auth } from "@clerk/nextjs/server";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";

/**
 * Contexto de tenant resuelto para una server action: usuario autenticado,
 * tenant activo, rol del miembro y `tenantDb` ya ligado al tenant.
 *
 * Reglas transversales de escritura (sección 2): sesión válida → tenant del
 * servidor → rol D7 → cadena de pertenencia → `isLocked` → validación →
 * transacción. Este helper cubre los tres primeros pasos.
 */
export type TenantRole = "SUPERADMIN" | "OWNER" | "STAFF" | "ADMIN" | "RECEPTION" | "ADVISOR";

export type TenantContext = {
  tenantId: string;
  /** Vertical del tenant (para la terminología de la UI). */
  vertical: string;
  userId: string;
  /** Id del `User` local (miembro del tenant), distinto del id de Clerk. */
  memberId: string;
  role: TenantRole;
  tenantDb: ReturnType<typeof createTenantDb>;
};

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario.
 * Devuelve `null` cuando algo falla (el caller responde con error genérico).
 *
 * Es la ÚNICA implementación de esta verificación: las actions no deben
 * duplicarla (cada copia es un punto donde la regla puede divergir).
 */
export async function requireTenantContext(
  tenantSlug: string,
): Promise<TenantContext | null> {
  if (!tenantSlug || tenantSlug.trim() === "") {
    return null;
  }
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    return null;
  }
  const tenantDb = createTenantDb(tenantRecord.id);
  const member = await tenantDb.users.findByClerkUserId(userId);
  // Retirado del equipo: conserva su historial pero ya no opera.
  if (!member || !member.active) {
    return null;
  }
  return {
    tenantId: tenantRecord.id,
    vertical: tenantRecord.vertical,
    userId,
    memberId: member.id,
    role: member.role as TenantRole,
    tenantDb,
  };
}

/**
 * D7 — Gobernanza del presupuesto: solo OWNER y SUPERADMIN pueden bloquear/
 * desbloquear, cambiar el AIU y aprobar la línea base. STAFF edita contenido
 * mientras el presupuesto no esté bloqueado.
 */
export function canGovernBudget(role: TenantRole): boolean {
  return role === "OWNER" || role === "SUPERADMIN" || role === "ADMIN";
}
