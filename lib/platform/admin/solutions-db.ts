import { db } from "@/prisma/db";
import { assess, withSolution, type Assessment } from "@/lib/core/capabilities/solution-assignment";
import type { SolutionId } from "@/lib/core/capabilities/solutions";

/** Un negocio con su solución asignada y lo que una persona debe revisar (Operations Center). */
export type SolutionRow = Assessment & { id: string; name: string; slug: string; vertical: string; active: boolean };

const LIMIT = 5000;

/** Todos los negocios con su solución, los dudosos primero y luego por nombre. */
export async function solutionReport(): Promise<SolutionRow[]> {
  const tenants = await db.orm.public.Tenant.where({}).orderBy((t) => t.name.asc()).limit(LIMIT).include("modules", (m) => m.select("moduleName", "active")).all();
  const rows = tenants.map<SolutionRow>((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    vertical: String(t.vertical),
    active: t.active,
    ...assess(String(t.vertical), t.settings, t.modules.filter((m) => m.active).map((m) => String(m.moduleName))),
  }));
  return rows.sort((a, b) => Number(b.doubtful) - Number(a.doubtful) || a.name.localeCompare(b.name, "es"));
}

/** Fija la solución de un negocio a mano (`null` = volver a la del rubro). Conserva el resto de sus ajustes. */
export async function setTenantSolution(tenantId: string, solution: SolutionId | null): Promise<{ name: string } | null> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).select("name", "settings").first();
  if (!tenant) return null;
  await db.orm.public.Tenant.where({ id: tenantId }).update({ settings: withSolution(tenant.settings, solution) as never });
  return { name: tenant.name };
}
