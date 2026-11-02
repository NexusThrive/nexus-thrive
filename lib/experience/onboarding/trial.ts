import { PLANS, type PlanKey } from "@/lib/core/entitlements/catalog";
import { getTrialState } from "@/lib/platform/benefits/benefits-db";

/**
 * Lo que la barra superior muestra de la prueba del negocio (días restantes, fecha de fin, plan y nivel de aviso), o `null`
 * si no hay prueba ni acceso temporal. Vive en Experience para que las páginas no importen `platform` directamente: la
 * lectura sigue en `platform/benefits` (cohesión con el canje y el vencimiento).
 */
export async function loadTrialIndicator(tenantId: string) {
  const trial = await getTrialState(tenantId);
  if (!trial) return null;
  return { daysLeft: trial.daysLeft, endsAt: trial.endsAt, level: trial.level, planName: PLANS[trial.plan as PlanKey]?.name ?? trial.plan };
}
