import { recordCharge } from "@/lib/business/charge";
import { moneyTransaction } from "@/lib/business/money-service";
import type { db } from "@/prisma/db";

/**
 * Escrituras de membresías que van con dinero. La membresía y su cobro (recibo
 * consecutivo; en efectivo, entra a la caja abierta) pasan juntos o no pasan,
 * en una transacción del servicio de dinero. Las fechas y el estado los
 * calcula quien llama (`lib/business/memberships.ts`).
 */

type ChargeInput = { method: string; description: string } | null;

type MembershipCreate = Parameters<typeof db.orm.public.Membership.create>[0];
type MembershipStatusValue = MembershipCreate["status"];
type MembershipTypeValue = MembershipCreate["type"];

/** Crea una membresía y, si se pide, su cobro inicial. */
export async function createMembershipWithCharge(
  tenantId: string,
  memberId: string,
  input: {
    customerId: string;
    type: MembershipTypeValue;
    startDate: Temporal.Instant;
    endDate: Temporal.Instant;
    status: MembershipStatusValue;
    price: string;
    charge: ChargeInput;
  },
) {
  const { charge, ...fields } = input;
  await moneyTransaction(async (tx) => {
    const membership = await tx.orm.public.Membership.create({ tenantId, ...fields });
    if (charge) {
      await recordCharge(
        tenantId,
        {
          customerId: fields.customerId,
          membershipId: membership.id,
          method: charge.method,
          amount: Number(fields.price),
          description: charge.description,
          sourceType: "MEMBERSHIP",
          sourceId: membership.id,
        },
        memberId,
        tx,
      );
    }
  });
}

/** Extiende una membresía del negocio y, si se pide, cobra la renovación. */
export async function renewMembershipWithCharge(
  tenantId: string,
  memberId: string,
  input: {
    membershipId: string;
    customerId: string;
    endDate: Temporal.Instant;
    status: MembershipStatusValue;
    price: string;
    charge: ChargeInput;
  },
) {
  await moneyTransaction(async (tx) => {
    await tx.orm.public.Membership.where({ id: input.membershipId, tenantId }).update({ endDate: input.endDate, status: input.status });
    if (input.charge) {
      await recordCharge(
        tenantId,
        {
          customerId: input.customerId,
          membershipId: input.membershipId,
          method: input.charge.method,
          amount: Number(input.price),
          description: input.charge.description,
          sourceType: "MEMBERSHIP",
          sourceId: input.membershipId,
        },
        memberId,
        tx,
      );
    }
  });
}
