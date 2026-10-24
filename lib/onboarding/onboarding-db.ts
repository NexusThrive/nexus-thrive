import { seedAccounting } from "@/lib/accounting/accounting-db";
import { db } from "@/prisma/db";
import type { ModuleValue } from "@/lib/onboarding/types";

/**
 * Escrituras del alta de un negocio (onboarding). Las reglas (validación,
 * plan, módulos, permisos) las aplica la acción; aquí solo se guarda, en una
 * transacción por paso.
 */

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Campos del negocio que guarda el alta (perfil + plan + completado). */
export type OnboardingTenantFields = Parameters<typeof db.orm.public.Tenant.create>[0];

/** Reemplaza el set de módulos activos del negocio (selección exacta). */
async function syncModules(tx: DbTransaction, tenantId: string, selected: ModuleValue[]): Promise<void> {
  const selectedSet = new Set<string>(selected);
  const existing = await tx.orm.public.TenantModule.where({ tenantId }).all();

  // Los que ya no están en la selección se desactivan (nunca se borran:
  // el historial de activación queda en la fila).
  for (const row of existing) {
    if (!selectedSet.has(row.moduleName)) {
      await tx.orm.public.TenantModule.where({ id: row.id, tenantId }).update({ active: false });
    }
  }

  // Los seleccionados se aseguran activos (idempotente por unique).
  for (const moduleName of selected) {
    await tx.orm.public.TenantModule.upsert({
      create: { tenantId, moduleName },
      update: { active: true },
      conflictOn: { tenantId, moduleName },
    });
  }
}

/** El negocio por id (para reanudar su alta). */
export async function onboardingTenant(tenantId: string) {
  return db.orm.public.Tenant.where({ id: tenantId }).first();
}

/** La membresía de una cuenta en ese negocio (rol y si está activa). */
export async function onboardingMembership(clerkUserId: string, tenantId: string) {
  return db.orm.public.User.where({ clerkUserId, tenantId }).first();
}

/** ¿El enlace (slug) ya lo usa algún negocio? Único en toda la plataforma. */
export async function slugInUse(slug: string): Promise<boolean> {
  return (await db.orm.public.Tenant.where({ slug }).select("id").first()) !== null;
}

/** Negocio ya completado de la cuenta, si tiene (en el piloto, una cuenta = un negocio). */
export async function completedTenantOf(clerkUserId: string): Promise<{ name: string } | null> {
  const membership = await db.orm.public.User.where({ clerkUserId }).first();
  if (!membership?.tenantId) return null;
  const owned = await db.orm.public.Tenant.where({ id: membership.tenantId }).first();
  return owned?.onboardingCompleted ? { name: owned.name } : null;
}

/** Completa el alta de un negocio que ya existía: perfil, plan y módulos juntos. */
export async function completeExistingTenant(
  tenantId: string,
  fields: Parameters<ReturnType<typeof db.orm.public.Tenant.where>["update"]>[0],
  modules: ModuleValue[],
) {
  await db.transaction(async (tx) => {
    await tx.orm.public.Tenant.where({ id: tenantId }).update(fields);
    await syncModules(tx, tenantId, modules);
  });
}

/** Crea el negocio, su dueño y sus módulos en una sola transacción. Devuelve el id. */
export async function createTenantWithOwner(
  fields: OnboardingTenantFields,
  owner: { clerkUserId: string; email: string; name: string },
  modules: ModuleValue[],
): Promise<string> {
  return db.transaction(async (tx) => {
    const tenant = await tx.orm.public.Tenant.create(fields);
    await tx.orm.public.User.create({ ...owner, role: "OWNER", tenantId: tenant.id });
    await syncModules(tx, tenant.id, modules);
    // Un negocio nuevo trae su plan de cuentas y sus reglas contables de partida.
    await seedAccounting(tenant.id, tx);
    return tenant.id;
  });
}
