import { openObligation } from "@/lib/business/sales/obligations";
import type { MoneyTx } from "@/lib/business/sales/money-service";

/**
 * Deuda de una membresía (HU-obligaciones-01): al inscribir o renovar se abre lo que el socio debe, y el cobro de
 * `recordIncome` (origen MEMBERSHIP) la baja. Si no se cobra en el momento, queda en cartera con su vencimiento.
 * `originId` es el id de la membresía; las renovaciones llevan `:fecha` para no chocar con la inscripción.
 */
export async function openMembershipDebt(
  tx: MoneyTx,
  tenantId: string,
  input: { membershipId: string; renewalOf?: Temporal.Instant; customerId: string; amount: number; description: string; dueDate: Temporal.Instant },
): Promise<void> {
  const customer = await tx.orm.public.Customer.where({ tenantId, id: input.customerId }).select("name").first();
  await openObligation(tx, tenantId, {
    originType: "MEMBERSHIP",
    originId: input.renewalOf ? `${input.membershipId}:${input.renewalOf.epochMilliseconds}` : input.membershipId,
    customerId: input.customerId,
    debtorName: customer?.name ?? "Socio",
    description: input.description,
    amount: input.amount,
    dueDate: input.dueDate,
  });
}
