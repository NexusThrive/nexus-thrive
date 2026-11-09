/**
 * Inscripción de un cliente a un plan del gimnasio (`enrollInPlan`): crea la membresía desde hoy y, si quien
 * registra maneja dinero, el cobro con su recibo, todo en una sola transacción del servicio de dinero.
 */
import { db } from "@/prisma/db";
import { membershipTypeFor } from "@/lib/business/customers/customer-fields";
import { bogotaEndOfDay, bogotaStartOfDay, computeMembershipStatus, type MembershipTypeValue } from "@/lib/industry/gym/memberships";
import { bogotaToday } from "@/lib/foundation/dates/plain-date";
import { openMembershipDebt } from "./membership-debt";
import { moneyTransaction, recordIncome } from "@/lib/business/sales/money-service";

type Plan = { id: string; name: string; price: number; durationDays: number };

/** Membresía vigente (no cancelada y sin vencer) con el plan que la originó. */
export type ActiveMembership = {
  id: string;
  productId: string | null;
  status: MembershipTypeValue;
  endDate: string;
};

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
      productId: plan.id,
      type: membershipTypeFor(plan.durationDays),
      startDate: startInstant,
      endDate: endInstant,
      status: computeMembershipStatus(endInstant, now),
      price: plan.price.toFixed(2),
    });
    await openMembershipDebt(tx, tenantId, { membershipId: membership.id, customerId, amount: plan.price, description: `${plan.name} — inscripción`, dueDate: startInstant });
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

/**
 * Membresía vigente del cliente: la no cancelada que vence más lejos. La ficha
 * la usa para saber si el socio ya tiene acceso y para asignar, cambiar o
 * retirar el plan sin duplicar membresías.
 */
export async function activeMembershipFor(tenantId: string, customerId: string): Promise<ActiveMembership | null> {
  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
  const row = await db.orm.public.Membership
    .where({ tenantId, customerId })
    .where((m) => m.cancelledAt.isNull())
    .where((m) => m.endDate.gt(now))
    .orderBy((m) => m.endDate.desc())
    .select("id", "productId", "type", "endDate")
    .first();
  return row ? { id: row.id, productId: row.productId, status: row.type, endDate: String(row.endDate) } : null;
}

/**
 * Cancela las membresías vigentes del cliente (cambio de plan o retiro desde
 * la ficha). Conserva el histórico: no borra, solo marca `cancelledAt`.
 */
export async function cancelActiveMemberships(tenantId: string, customerId: string, reason: string): Promise<void> {
  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
  await db.orm.public.Membership
    .where({ tenantId, customerId })
    .where((m) => m.cancelledAt.isNull())
    .where((m) => m.endDate.gt(now))
    .update({ cancelledAt: now, cancelReason: reason.slice(0, 200) });
}
