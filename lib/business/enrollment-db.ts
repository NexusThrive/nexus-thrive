import { membershipTypeFor } from "@/lib/business/customer-fields";
import { bogotaEndOfDay, bogotaStartOfDay, bogotaToday, computeMembershipStatus } from "@/lib/business/memberships";
import { moneyTransaction, recordIncome } from "@/lib/business/money-service";

type Plan = { id: string; name: string; price: number; durationDays: number };

/**
 * Inscribe a un cliente del negocio en un plan desde hoy: crea la membresía
 * y, si `method` viene (quien registra maneja dinero), el cobro con recibo y
 * caja. Todo en una sola transacción del servicio de dinero: o queda todo o
 * nada.
 */
export async function enrollInPlan(
  tenantId: string,
  input: { customerId: string; customerName: string; plan: Plan; method: string | null },
  memberId: string,
) {
  const { customerId, customerName, plan, method } = input;
  const start = bogotaToday();
  const startInstant = bogotaStartOfDay(start);
  const endDate = new Date(Date.UTC(start.year, start.month - 1, start.day + plan.durationDays - 1));
  const endInstant = bogotaEndOfDay({ year: endDate.getUTCFullYear(), month: endDate.getUTCMonth() + 1, day: endDate.getUTCDate() });
  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
  await moneyTransaction(async (tx) => {
    const membership = await tx.orm.public.Membership.create({
      tenantId,
      customerId,
      type: membershipTypeFor(plan.durationDays),
      startDate: startInstant,
      endDate: endInstant,
      status: computeMembershipStatus(endInstant, now),
      price: plan.price.toFixed(2),
    });
    if (method) {
      await recordIncome(
        tx,
        tenantId,
        {
          amount: plan.price,
          method,
          customerId,
          membershipId: membership.id,
          description: `${plan.name} — inscripción`,
          cashDescription: `${plan.name} — ${customerName}`,
          sourceType: "MEMBERSHIP",
          sourceId: membership.id,
        },
        memberId,
      );
    }
  });
}
