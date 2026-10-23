import { db } from "@/prisma/db";
import type { ModuleValue } from "@/lib/admin/catalogs";

/**
 * Configuración del negocio (perfil y módulos), siempre por `tenantId`.
 */

/**
 * ¿El slug ya lo usa **otro** negocio? El slug es único en toda la
 * plataforma, así que se busca sin negocio a propósito; solo se responde sí o
 * no.
 */
export async function slugTakenByOther(slug: string, tenantId: string): Promise<boolean> {
  const existing = await db.orm.public.Tenant.where({ slug }).select("id").first();
  return existing !== null && existing.id !== tenantId;
}

export async function updateTenantProfile(
  tenantId: string,
  fields: { name: string; slug: string | undefined; city?: string; address?: string; taxId?: string; whatsappNumber?: string },
) {
  await db.orm.public.Tenant.where({ id: tenantId }).update(fields);
}

/** Rubro y módulos contratados: lo que decide qué módulos se pueden prender. */
export async function moduleRulesOf(tenantId: string) {
  return db.orm.public.Tenant.select("vertical", "contractedModules").where({ id: tenantId }).first();
}

/** Prende o apaga un módulo (idempotente en ambas direcciones). */
export async function setTenantModule(tenantId: string, moduleName: ModuleValue, active: boolean) {
  await db.orm.public.TenantModule.upsert({
    create: { tenantId, moduleName, active },
    update: { active },
    conflictOn: { tenantId, moduleName },
  });
}

/** Módulos activos del negocio. */
export async function activeModuleNames(tenantId: string): Promise<string[]> {
  const rows = await db.orm.public.TenantModule.where({ tenantId, active: true }).select("moduleName").all();
  return rows.map((m) => String(m.moduleName));
}
