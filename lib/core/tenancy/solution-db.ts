import { db } from "@/prisma/db";
import { resolveSolution } from "@/lib/core/capabilities/solution-assignment";
import type { SolutionId } from "@/lib/core/capabilities/solutions";

/** Solución efectiva de un negocio: la fijada por el Operations Center o, si no, la de su rubro. */
export async function solutionOfTenant(tenantId: string): Promise<SolutionId> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).select("vertical", "settings").first();
  return resolveSolution(tenant?.vertical, tenant?.settings).solution;
}
