import type { createTenantDb } from "@/lib/tenant-db";

type TenantDb = ReturnType<typeof createTenantDb>;

/**
 * Crea (si faltan) los tres contenedores de una obra: presupuesto, plan Lean
 * y bitácora. Idempotente: cada `getOrCreate*` devuelve el existente. Se llama
 * al crear la obra y desde la acción explícita "Preparar obra" para obras
 * antiguas; nunca durante el render (un GET no debe escribir).
 */
export async function ensureProjectContainers(
  tenantDb: TenantDb,
  projectId: string,
): Promise<void> {
  await tenantDb.budgets.getOrCreate(projectId);
  await tenantDb.lean.getOrCreatePlan(projectId);
  await tenantDb.fieldLog.getOrCreateLog(projectId);
}
