import type { ConstructionDb } from "@/lib/industry/construction/construction-db";

/**
 * Crea (si faltan) los tres contenedores de una obra: presupuesto, plan Lean
 * y bitácora. Idempotente: cada `getOrCreate*` devuelve el existente. Se llama
 * al crear la obra y desde la acción explícita "Preparar obra" para obras
 * antiguas; nunca durante el render (un GET no debe escribir).
 */
export async function ensureProjectContainers(
  construction: ConstructionDb,
  projectId: string,
): Promise<void> {
  await construction.budgets.getOrCreate(projectId);
  await construction.lean.getOrCreatePlan(projectId);
  await construction.fieldLog.getOrCreateLog(projectId);
}
