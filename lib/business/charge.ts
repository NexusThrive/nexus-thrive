import { db } from "@/prisma/db";
import { addCashMovement, assignReceiptNumber, currentCashSession } from "./finance-db";
import { receiptCode } from "./invoice";

/**
 * Registra un cobro aprobado con su recibo consecutivo. Si es en efectivo y
 * hay un turno de caja abierto, el dinero entra a esa caja. Es el mismo
 * camino de la venta directa, para taquilla, salidas, renovaciones, etc.
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
): Promise<{ paymentId: string; receipt: string }> {
  const amount = Math.round(c.amount * 100) / 100;
  const payment = await db.orm.public.Payment.create({
    tenantId,
    customerId: c.customerId ?? null,
    membershipId: c.membershipId ?? null,
    amount: amount.toFixed(2),
    status: "APPROVED",
    provider: c.method as "CASH",
    description: c.description.slice(0, 200),
    sourceType: c.sourceType,
    sourceId: c.sourceId,
  });
  const number = await assignReceiptNumber(tenantId, payment.id);
  if (c.method === "CASH") {
    const cash = await currentCashSession(tenantId);
    if (cash) {
      await db.orm.public.Payment.where({ tenantId, id: payment.id }).update({ cashSessionId: cash.sessionId });
      await addCashMovement(tenantId, { sessionId: cash.sessionId, kind: "INCOME", amount, description: c.description.slice(0, 120), paymentId: payment.id }, userId);
    }
  }
  return { paymentId: payment.id, receipt: receiptCode(number) };
}
