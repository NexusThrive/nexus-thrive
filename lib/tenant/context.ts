import { cache } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";
import type { BusinessRole } from "@/lib/business/roles";
import { can } from "@/lib/business/permissions";
import { modulesForRoute } from "@/lib/navigation/tenant-nav";

/**
 * Contexto de tenant resuelto para una server action: usuario autenticado,
 * tenant activo, rol del miembro y `tenantDb` ya ligado al tenant.
 *
 * Reglas transversales de escritura (sección 2): sesión válida → tenant del
 * servidor → rol D7 → cadena de pertenencia → `isLocked` → validación →
 * transacción. Este helper cubre los tres primeros pasos.
 */
export type TenantRole = BusinessRole;

export type TenantContext = {
  tenantId: string;
  /** Vertical del tenant (para la terminología de la UI). */
  vertical: string;
  userId: string;
  /** Id del `User` local (miembro del tenant), distinto del id de Clerk. */
  memberId: string;
  role: TenantRole;
  tenantDb: ReturnType<typeof createTenantDb>;
  /** Registro del negocio, ya comprobado activo. */
  tenant: TenantRecord;
};

type TenantRecord = NonNullable<Awaited<ReturnType<typeof loadActiveTenant>>>;

function loadActiveTenant(slug: string) {
  return db.orm.public.Tenant.where({ slug, active: true }).first();
}

/**
 * Verifica sesión de Clerk + tenant activo + membresía del usuario.
 * Devuelve `null` cuando algo falla (el caller responde con error genérico).
 *
 * Es la ÚNICA implementación de esta verificación: las actions no deben
 * duplicarla (cada copia es un punto donde la regla puede divergir).
 */
export async function requireTenantContext(
  tenantSlug: string,
  /**
   * Ruta del módulo al que pertenece la acción o página ("/crm",
   * "/projects"…). Si se pasa, el negocio debe tener activo un módulo que la
   * habilite (SEC-06): un módulo apagado no se usa ni por petición directa.
   */
  route?: string,
): Promise<TenantContext | null> {
  if (!tenantSlug || tenantSlug.trim() === "") {
    return null;
  }
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const tenantRecord = await loadActiveTenant(tenantSlug);
  if (!tenantRecord) {
    return null;
  }
  const tenantDb = createTenantDb(tenantRecord.id);
  const member = await tenantDb.users.findByClerkUserId(userId);
  // Retirado del equipo: conserva su historial pero ya no opera.
  if (!member || !member.active) {
    return null;
  }
  if (route && !(await isRouteEnabled(tenantRecord.id, route))) {
    return null;
  }
  return {
    tenantId: tenantRecord.id,
    vertical: tenantRecord.vertical,
    userId,
    memberId: member.id,
    role: member.role as TenantRole,
    tenantDb,
    tenant: tenantRecord,
  };
}

/**
 * Lo mismo para una página bajo `app/[tenant]`: sesión → negocio activo →
 * membresía activa, o 404 indistinguible. Cada página la llama antes de leer
 * datos (SEC-03): el layout no basta, porque en la navegación del App Router
 * puede no ejecutarse y se renderiza en paralelo con la página.
 *
 * Memoizada por petición con `cache()`: layout, página y componentes que la
 * llamen comparten una sola resolución.
 */
export const requirePageContext = cache(async (tenantSlug: string, route?: string): Promise<TenantContext> => {
  const ctx = await requireTenantContext(tenantSlug, route);
  if (!ctx) notFound();
  return ctx;
});

/** ¿El negocio tiene activo algún módulo que habilite la ruta? */
export async function isRouteEnabled(tenantId: string, route: string): Promise<boolean> {
  const modules = modulesForRoute(route);
  if (!modules) return true;
  const row = await db.orm.public.TenantModule.where({ tenantId, active: true })
    .where((m) => m.moduleName.in([...modules]))
    .select("id")
    .first();
  return row !== null;
}

/**
 * D7 — Gobernanza del presupuesto: solo OWNER y SUPERADMIN pueden bloquear/
 * desbloquear, cambiar el AIU y aprobar la línea base. STAFF edita contenido
 * mientras el presupuesto no esté bloqueado.
 */
export function canGovernBudget(role: TenantRole): boolean {
  return can(role, "budget.govern");
}
