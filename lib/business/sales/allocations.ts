import { toNumber } from "@/lib/foundation/format";
import type { DbTransaction } from "@/lib/foundation/db/db-transaction";
import { MoneyError } from "./money-error";

/**
 * Aplicación de pagos (HU-aplicacion-01, D-8): reparte UN pago entre lo que cubre. El dinero se mueve una sola vez
 * (`Payment`); `PaymentAllocation` dice a qué cuenta, pedido o membresía fue cada parte. La suma aplicada de un pago
 * nunca supera su monto. Todo por `tenantId`, dentro de la transacción del cobro.
 */
export type AllocationTarget = "INVOICE" | "OBLIGATION";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Suma ya aplicada de un pago. */
export async function allocatedOf(tx: DbTransaction, tenantId: string, paymentId: string): Promise<number> {
  const rows = await tx.orm.public.PaymentAllocation.where({ tenantId, paymentId }).select("amount").all();
  return round2(rows.reduce((sum, r) => sum + toNumber(r.amount), 0));
}

/** Aplica `amount` del pago a un destino. Falla si lo aplicado superaría el pago o el monto no es positivo. */
export async function allocatePayment(tx: DbTransaction, tenantId: string, input: { paymentId: string; paymentAmount: number; targetType: AllocationTarget; targetId: string; amount: number }): Promise<void> {
  const amount = round2(input.amount);
  if (!(amount > 0)) throw new MoneyError("Lo aplicado debe ser mayor que cero.");
  const already = await allocatedOf(tx, tenantId, input.paymentId);
  if (round2(already + amount) > round2(input.paymentAmount)) throw new MoneyError("Lo aplicado no puede superar el valor del pago.");
  await tx.orm.public.PaymentAllocation.create({ tenantId, paymentId: input.paymentId, targetType: input.targetType, targetId: input.targetId, amount: amount.toFixed(2) });
}

/** Deshace las aplicaciones de un pago anulado: las obligaciones recuperan su saldo y se reabren si se habían pagado. */
export async function releaseAllocations(tx: DbTransaction, tenantId: string, paymentId: string): Promise<void> {
  const rows = await tx.orm.public.PaymentAllocation.where({ tenantId, paymentId }).all();
  for (const a of rows) {
    if (a.targetType === "OBLIGATION") {
      const o = await tx.orm.public.Obligation.where({ tenantId, id: a.targetId }).select("paidTotal", "status").first();
      if (o && o.status !== "VOID") {
        const paid = Math.max(0, round2(toNumber(o.paidTotal) - toNumber(a.amount)));
        await tx.orm.public.Obligation.where({ tenantId, id: a.targetId }).update({ paidTotal: paid.toFixed(2), status: "OPEN" });
      }
    }
    // El saldo de las cuentas de cobro lo devuelve `voidPayment` con el resto de su contabilidad.
  }
  await tx.orm.public.PaymentAllocation.where({ tenantId, paymentId }).deleteAll();
}

export type AllocationRow = { id: string; paymentId: string; targetType: AllocationTarget; targetId: string; amount: number };

/** Aplicaciones de un pago, para mostrar a qué fue cada parte. */
export async function allocationsOfPayment(tx: DbTransaction, tenantId: string, paymentId: string): Promise<AllocationRow[]> {
  const rows = await tx.orm.public.PaymentAllocation.where({ tenantId, paymentId }).all();
  return rows.map((r) => ({ id: r.id, paymentId: r.paymentId, targetType: r.targetType as AllocationTarget, targetId: r.targetId, amount: toNumber(r.amount) }));
}
