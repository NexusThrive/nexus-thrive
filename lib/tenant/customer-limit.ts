import { db } from "@/prisma/db";

/**
 * Límite de clientes acordado para el negocio (código a medida) y cuántos
 * activos tiene. `limit` null = sin límite propio.
 *
 * Es política de planes de Core, igual que `seatLimit` (usuarios) en `team-db.ts`: el límite
 * es un atributo del negocio (`Tenant.maxCustomers`) y lo aplican el medidor de consumo y las
 * altas de clientes. Antes vivía en `lib/business/customers/customers-db.ts` y obligaba a Core a importar
 * de Business.
 */
export async function customerLimit(tenantId: string): Promise<{ limit: number | null; used: number }> {
  const [t, used] = await Promise.all([
    db.orm.public.Tenant.where({ id: tenantId }).select("maxCustomers").first(),
    db.orm.public.Customer.where({ tenantId, active: true }).aggregate((a) => ({ n: a.count() })),
  ]);
  return { limit: t?.maxCustomers ?? null, used: Number(used.n) };
}
