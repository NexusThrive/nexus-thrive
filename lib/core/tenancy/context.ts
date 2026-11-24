import { cache } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/core/tenancy/db";
import type { BusinessRole } from "@/lib/core/auth/roles";
import { can } from "@/lib/core/auth/permissions";
import { modulesForRoute } from "@/lib/core/capabilities/route-modules";
import { canOperateTenant } from "./access-policy";

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
  /** Nombre del miembro en el equipo (ya leído al verificar la membresía: evita pedirlo otra vez para un saludo). */
  memberName: string | null;
  role: TenantRole;
  tenantDb: ReturnType<typeof createTenantDb>;
  /** Registro del negocio, ya comprobado activo. */
  tenant: TenantRecord;
};

type TenantRecord = NonNullable<Awaited<ReturnType<typeof loadActiveTenant>>>;

/**
 * El negocio con ese slug, solo si está activo y puede operar (suspendido = `null`). Memoizada por petición (`cache()`): el
 * layout del negocio, el contexto de la página y las acciones lo piden con el mismo slug y antes eran tres viajes a la base.
 */
export const loadActiveTenant = cache(async (slug: string) => {
  const tenant = await db.orm.public.Tenant.where({ slug, active: true }).first();
  return tenant && canOperateTenant(tenant) ? tenant : null;
});

/**
 * La membresía de la sesión en el negocio, memoizada por petición: el contexto de la página y el layout de la app la leían
 * cada uno por su lado.
 */
export const memberByClerkUser = cache((tenantId: string, clerkUserId: string) => createTenantDb(tenantId).users.findByClerkUserId(clerkUserId));

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
   * Ruta del módulo al que pertenece la acción o página ("/contactos",
   * "/proyectos"…). Si se pasa, el negocio debe tener activo un módulo que la
   * habilite (SEC-06): un módulo apagado no se usa ni por petición directa.
   */
  route?: string,
): Promise<TenantContext | null> {
  if (!tenantSlug || tenantSlug.trim() === "") {
    return null;
  }
  // Sesión y negocio a la vez, y después membresía y módulo a la vez: dos viajes a la base en lugar de tres seguidos. Cada página y
  // cada acción pasa por aquí, así que es lo primero que se espera al cambiar de sección. Las reglas no cambian: sin sesión, sin
  // negocio activo, sin membresía activa o con el módulo apagado no se entra.
  const [{ userId }, tenantRecord] = await Promise.all([auth(), loadActiveTenant(tenantSlug)]);
  if (!userId || !tenantRecord) {
    return null;
  }
  const tenantDb = createTenantDb(tenantRecord.id);
  const [member, routeOk] = await Promise.all([memberByClerkUser(tenantRecord.id, userId), route ? isRouteEnabled(tenantRecord.id, route) : true]);
  // Retirado del equipo: conserva su historial pero ya no opera.
  if (!member || !member.active || !routeOk) {
    return null;
  }
  return {
    tenantId: tenantRecord.id,
    vertical: tenantRecord.vertical,
    userId,
    memberId: member.id,
    memberName: member.name ?? null,
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

/** ¿El negocio tiene activo algún módulo que habilite la ruta? Memoizada por petición. */
export const isRouteEnabled = cache(async (tenantId: string, route: string): Promise<boolean> => {
  const modules = modulesForRoute(route);
  if (!modules) return true;
  const row = await db.orm.public.TenantModule.where({ tenantId, active: true })
    .where((m) => m.moduleName.in([...modules]))
    .select("id")
    .first();
  return row !== null;
});

/**
 * D7 — Gobernanza del presupuesto: solo OWNER y SUPERADMIN pueden bloquear/
 * desbloquear, cambiar el AIU y aprobar la línea base. STAFF edita contenido
 * mientras el presupuesto no esté bloqueado.
 */
export function canGovernBudget(role: TenantRole): boolean {
  return can(role, "budget.govern");
}
