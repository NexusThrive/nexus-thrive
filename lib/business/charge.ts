import { moneyTransaction, recordIncome, type MoneyTx } from "./money-service";

/**
 * Registra un cobro aprobado con su recibo consecutivo. Si es en efectivo y
 * hay un turno de caja abierto, el dinero entra a esa caja. Es el mismo
 * camino de la venta directa, para taquilla, salidas, renovaciones, etc.
 *
 * Todo pasa en una transacción (`lib/business/money-service.ts`). Con `tx`, el cobro
 * se suma a la transacción de quien llama (por ejemplo, junto con la
 * membresía que se vende).
 */
export async function recordCharge(
  tenantId: string,
  c: {
    amount: number;
    method: string;
    description: string;
    customerId?: string | null;
    membershipId?: string | null;
    sourceType: string;
    sourceId: string;
  },
  userId: string,
  tx?: MoneyTx,
): Promise<{ paymentId: string; receipt: string }> {
  const run = (t: MoneyTx) =>
    recordIncome(
      t,
      tenantId,
      {
        amount: c.amount,
        method: c.method,
        description: c.description,
        cashDescription: c.description,
        customerId: c.customerId,
        membershipId: c.membershipId,
        sourceType: c.sourceType,
        sourceId: c.sourceId,
      },
      userId,
    );
  const income = tx ? await run(tx) : await moneyTransaction(run);
  return { paymentId: income.paymentId, receipt: income.receipt };
}
