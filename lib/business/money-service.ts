import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import type { PaymentStatusValue } from "@/lib/finance";
import { applyStock, validateStockMove } from "./inventory";
import { receiptCode } from "./invoice";

/**
 * Servicio de dinero (DATA-01 en docs/nexus-architecture/technical-debt.md y
 * ADR-0006). Un cobro es varias escrituras —el pago, su recibo consecutivo, la
 * caja del turno, el estado del documento que se paga, el stock que se vende—
 * y tienen que pasar todas o ninguna:
 *
 * - Todo va en UNA transacción (`moneyTransaction`). Si dos cobros chocan por
 *   el mismo número de recibo (índice único por negocio), la transacción
 *   entera se reintenta con el número siguiente: nunca queda un pago sin
 *   número ni una caja sin su movimiento.
 * - Lo que se cobra una sola vez (una factura, una reserva, un pago que se
 *   anula) se reclama con un UPDATE condicional sobre su estado. Si otro clic
 *   ya lo reclamó, el UPDATE no afecta filas y se aborta: no hay doble cobro.
 */

export type MoneyTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Regla de negocio que impide el cobro: aborta la transacción con un mensaje para la persona. */
export class MoneyError extends Error {}

const isReceiptCollision = (e: unknown) => /receiptNumber/i.test(String((e as Error)?.message ?? e));

/** Corre `fn` en una transacción; la reintenta completa si dos cobros toman el mismo recibo. */
export async function moneyTransaction<T>(fn: (tx: MoneyTx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(fn);
    } catch (e) {
      if (attempt >= 5 || !isReceiptCollision(e)) throw e;
    }
  }
}

/**
 * Turno abierto de la caja principal: la primera caja activa (por creación)
 * que tenga un turno abierto. Mismo criterio que `currentCashSession`.
 */
async function openCashSessionId(tx: MoneyTx, tenantId: string): Promise<string | null> {
  const boxes = await tx.orm.public.CashBox.where({ tenantId, active: true })
    .orderBy((b) => b.createdAt.asc())
    .select("id")
    .all();
  if (!boxes.length) return null;
  const open = await tx.orm.public.CashSession.where({ tenantId })
    .where((s) => s.boxId.in(boxes.map((b) => b.id)))
    .where((s) => s.closedAt.isNull())
    .select("id", "boxId")
    .all();
  for (const box of boxes) {
    const session = open.find((s) => s.boxId === box.id);
    if (session) return session.id;
  }
  return null;
}

export type IncomeInput = {
  /** Monto en pesos (número) o decimal ya formateado ("12000.00"). */
  amount: number | string;
  method: string;
  /** `APPROVED` por defecto. Solo un cobro aprobado en efectivo entra a la caja. */
  status?: PaymentStatusValue;
  description: string | null;
  /** Texto del movimiento de caja (por defecto, la descripción o el recibo). */
  cashDescription?: string;
  customerId?: string | null;
  membershipId?: string | null;
  invoiceId?: string | null;
  providerRefId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
};

export type Income = { paymentId: string; receiptNumber: number; receipt: string; createdAt: string };

/**
 * Registra un ingreso dentro de `tx`: el pago con su recibo consecutivo y, si
 * es efectivo aprobado con un turno abierto, el movimiento de caja.
 */
export async function recordIncome(tx: MoneyTx, tenantId: string, input: IncomeInput, userId: string): Promise<Income> {
  const amount =
    typeof input.amount === "string" ? toNumber(input.amount).toFixed(2) : (Math.round(input.amount * 100) / 100).toFixed(2);
  const status = input.status ?? "APPROVED";

  const { top } = await tx.orm.public.Payment.where({ tenantId }).aggregate((a) => ({ top: a.max("receiptNumber") }));
  const receiptNumber = (top ?? 0) + 1;
  const sessionId = input.method === "CASH" && status === "APPROVED" ? await openCashSessionId(tx, tenantId) : null;

  const payment = await tx.orm.public.Payment.create({
    tenantId,
    customerId: input.customerId ?? null,
    membershipId: input.membershipId ?? null,
    invoiceId: input.invoiceId ?? null,
    amount,
    status,
    provider: input.method as "CASH",
    description: input.description ? input.description.slice(0, 200) : null,
    providerRefId: input.providerRefId ?? null,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    receiptNumber,
    cashSessionId: sessionId,
  });

  const receipt = receiptCode(receiptNumber);
  if (sessionId) {
    await tx.orm.public.CashMovement.create({
      tenantId,
      sessionId,
      kind: "INCOME",
      amount,
      description: (input.cashDescription ?? input.description ?? `Recibo ${receipt}`).slice(0, 120),
      beneficiary: null,
      paymentId: payment.id,
      expenseId: null,
      createdById: userId,
    });
  }
  return { paymentId: payment.id, receiptNumber, receipt, createdAt: String(payment.createdAt) };
}

/** Un cobro suelto (taquilla, membresías, inscripciones…) en su propia transacción. */
export async function recordIncomeNow(tenantId: string, input: IncomeInput, userId: string): Promise<Income> {
  return moneyTransaction((tx) => recordIncome(tx, tenantId, input, userId));
}

// --- Reclamos de estado (una sola vez) --------------------------------------

/** Pasa la factura de ISSUED a PAID solo si sigue ISSUED. */
async function claimInvoice(tx: MoneyTx, tenantId: string, id: string): Promise<boolean> {
  const plan = tx.sql.public.Invoice.update({ status: "PAID" })
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "ISSUED")))
    .returning("id")
    .build();
  return (await tx.query(plan)).length > 0;
}

/** Pasa la reserva de taquilla de RESERVED a PAID solo si sigue RESERVED. */
async function claimTicketSale(tx: MoneyTx, tenantId: string, id: string): Promise<boolean> {
  const plan = tx.sql.public.TicketSale.update({ status: "PAID" })
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "RESERVED")))
    .returning("id")
    .build();
  return (await tx.query(plan)).length > 0;
}

/** Descuenta stock solo si nadie lo cambió desde la lectura (reintenta con la lectura nueva). */
async function takeStock(tx: MoneyTx, tenantId: string, productId: string, quantity: number): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = await tx.orm.public.Product.where({ tenantId, id: productId }).select("stock").first();
    if (!p) throw new MoneyError("No se encontró.");
    const err = validateStockMove(p.stock, "SALE", quantity);
    if (err) throw new MoneyError(err);
    const plan = tx.sql.public.Product.update({ stock: applyStock(p.stock, "SALE", quantity) })
      .where((f, fns) => fns.and(fns.eq(f.id, productId), fns.eq(f.tenantId, tenantId), fns.eq(f.stock, p.stock)))
      .returning("stock")
      .build();
    if ((await tx.query(plan)).length > 0) return;
  }
  throw new MoneyError("El inventario cambió mientras vendías. Intenta de nuevo.");
}

// --- Operaciones --------------------------------------------------------------

/** Paga una factura o cuenta de cobro. `null` si ya no está emitida (pagada, anulada o en otro clic). */
export async function payInvoice(tenantId: string, id: string, method: string, userId: string) {
  try {
    return await moneyTransaction(async (tx) => {
      const inv = await tx.orm.public.Invoice.where({ tenantId, id })
        .select("id", "kind", "number", "customerId", "customerName", "total")
        .first();
      if (!inv || !(await claimInvoice(tx, tenantId, id))) throw new MoneyError("Solo se pagan documentos emitidos.");
      const income = await recordIncome(
        tx,
        tenantId,
        {
          amount: String(inv.total),
          method,
          customerId: inv.customerId,
          invoiceId: inv.id,
          description: `${inv.kind === "BILL" ? "Cuenta de cobro" : "Recibo"} N.º ${inv.number} · ${inv.customerName}`,
          cashDescription: `Pago de cuenta N.º ${inv.number}`,
          sourceType: "INVOICE",
          sourceId: inv.id,
        },
        userId,
      );
      return { paymentId: income.paymentId, receiptNumber: income.receiptNumber };
    });
  } catch (e) {
    if (e instanceof MoneyError) return null;
    throw e;
  }
}

/** Cobra una reserva de taquilla una sola vez y confirma su visita. */
export async function payTicketSale(
  tenantId: string,
  id: string,
  method: string,
  userId: string,
  describe: (sale: { number: number; visitors: number; slot: string }) => string,
): Promise<{ ok: true; receipt: string } | { ok: false; message: string }> {
  try {
    return await moneyTransaction(async (tx) => {
      const s = await tx.orm.public.TicketSale.where({ tenantId, id }).first();
      if (!s) throw new MoneyError("La venta no existe.");
      if (s.status !== "RESERVED" || !(await claimTicketSale(tx, tenantId, id))) {
        throw new MoneyError(s.status === "VOID" ? "La venta está anulada." : "Ya está pagada.");
      }
      const income = await recordIncome(
        tx,
        tenantId,
        { amount: String(s.total), method, customerId: s.customerId, description: describe(s), sourceType: "TICKET_SALE", sourceId: s.id },
        userId,
      );
      await tx.orm.public.TicketSale.where({ tenantId, id }).update({ paymentId: income.paymentId });
      if (s.bookingId) {
        await tx.orm.public.Booking.where({ tenantId, id: s.bookingId }).update({
          status: "CONFIRMED",
          updatedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()),
        });
      }
      return { ok: true as const, receipt: income.receipt };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false, message: e.message };
    throw e;
  }
}

/** Venta directa de un producto: cobro, recibo, caja y stock en una sola transacción. */
export async function sellProduct(
  tenantId: string,
  input: { productId: string; name: string; price: number; trackStock: boolean; quantity: number; method: string; customerId: string | null },
  userId: string,
): Promise<{ ok: true; paymentId: string; receipt: string } | { ok: false; message: string }> {
  const total = Math.round(input.price * input.quantity * 100) / 100;
  try {
    return await moneyTransaction(async (tx) => {
      if (input.trackStock) await takeStock(tx, tenantId, input.productId, input.quantity);
      const income = await recordIncome(
        tx,
        tenantId,
        {
          amount: total,
          method: input.method,
          customerId: input.customerId,
          description: `${input.quantity > 1 ? `${input.quantity} × ` : ""}${input.name}`,
          cashDescription: `Venta: ${input.name}`,
          sourceType: "SALE",
          sourceId: input.productId,
        },
        userId,
      );
      if (input.trackStock) {
        await tx.orm.public.StockMovement.create({
          tenantId,
          productId: input.productId,
          kind: "SALE",
          quantity: input.quantity,
          note: `Venta ${income.receipt}`,
          paymentId: income.paymentId,
          createdById: userId,
        });
      }
      return { ok: true as const, paymentId: income.paymentId, receipt: income.receipt };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false, message: e.message };
    throw e;
  }
}

/** Anula un pago una sola vez; si entró a una caja abierta, la caja lo devuelve. */
export async function voidPayment(tenantId: string, paymentId: string, reason: string, userId: string) {
  try {
    return await moneyTransaction(async (tx) => {
      const p = await tx.orm.public.Payment.where({ tenantId, id: paymentId }).first();
      if (!p) throw new MoneyError("El pago no existe.");
      if (p.status === "VOIDED") throw new MoneyError("El pago ya está anulado.");
      const plan = tx.sql.public.Payment.update({
        status: "VOIDED",
        voidedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()),
        voidReason: reason,
      })
        .where((f, fns) => fns.and(fns.eq(f.id, paymentId), fns.eq(f.tenantId, tenantId), fns.eq(f.status, p.status)))
        .returning("id")
        .build();
      if ((await tx.query(plan)).length === 0) throw new MoneyError("El pago ya está anulado.");
      if (p.cashSessionId) {
        const s = await tx.orm.public.CashSession.where({ tenantId, id: p.cashSessionId }).select("closedAt").first();
        if (s && !s.closedAt) {
          await tx.orm.public.CashMovement.create({
            tenantId,
            sessionId: p.cashSessionId,
            kind: "ADJUST",
            amount: (-toNumber(p.amount)).toFixed(2),
            description: `Anulación de recibo ${receiptCode(p.receiptNumber ?? 0)}`,
            beneficiary: null,
            paymentId,
            expenseId: null,
            createdById: userId,
          });
        }
      }
      return { ok: true as const };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false as const, message: e.message };
    throw e;
  }
}
