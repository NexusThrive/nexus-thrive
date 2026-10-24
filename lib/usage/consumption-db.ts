import { customerLimit } from "@/lib/business/customers-db";
import { seatLimit } from "@/lib/business/team-db";
import { buildConsumption, type ConsumptionRow } from "./consumption";
import { usageSnapshot } from "./meters";

/** Consumo actual del negocio (equipo, clientes y medidores del mes), todo por `tenantId`. */
export async function consumptionFor(tenantId: string): Promise<ConsumptionRow[]> {
  const [seats, customers, meters] = await Promise.all([seatLimit(tenantId), customerLimit(tenantId), usageSnapshot(tenantId)]);
  return buildConsumption({ seats, customers, meters });
}
