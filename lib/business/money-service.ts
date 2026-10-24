import { emitEvent } from "@/lib/events/outbox";
import { db } from "@/prisma/db";
import { toNumber } from "@/lib/format";
import type { PaymentStatusValue } from "@/lib/finance";
import { applyStockMovement, StockError } from "@/lib/inventory/stock-service";
import { balanceOf, validatePayment } from "@/lib/receivables/aging";
import { cashAccountFor, postByRule, reverseSource } from "@/lib/accounting/ledger-db";
import { todayCO } from "@/lib/tax/tax";
import { MoneyError } from "./money-error";
import { receiptCode } from "./invoice";
import type { DocumentLineInput } from "./commercial-document";
import { insertDocument, issueCreditNote, saleDocumentOfPayment } from "./documents-db";

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

export { MoneyError };

// Dos cobros a la vez pueden tomar el mismo recibo o el mismo número de
// documento de venta: la restricción única falla y se reintenta todo.
const isReceiptCollision = (e: unknown) => /receiptNumber|Invoice_tenantId_kind_number|JournalEntry_tenantId_number/i.test(String((e as Error)?.message ?? e));

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
  /**
   * Líneas del documento de venta que deja el cobro (por defecto, una línea
   * con la descripción y el monto). Un cobro de una cuenta de cobro
   * (`sourceType: "INVOICE"`) no crea otro documento: la cuenta ya lo es.
   */
  documentLines?: DocumentLineInput[];
  /** Turno en el que entra el efectivo (punto de venta); por defecto, el de la caja principal. */
  cashSessionId?: string | null;
  /** El documento de venta lo crea quien llama (venta con varios pagos): este cobro no crea otro. */
  skipDocument?: boolean;
};

export type Income = { paymentId: string; receiptNumber: number; receipt: string; createdAt: string; documentId: string | null };

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
  const sessionId = input.method === "CASH" && status === "APPROVED" ? (input.cashSessionId ?? (await openCashSessionId(tx, tenantId))) : null;

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
  if (status === "APPROVED") await postByRule(tx, tenantId, "PAYMENT_RECEIVED", { payment: Number(amount) }, { date: todayCO(), description: `Cobro ${receipt}`, sourceType: "PAYMENT", sourceId: payment.id, swap: cashAccountFor(input.method) }, userId);
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
  // Documento comercial unificado (paso 2): toda venta cobrada deja el mismo
  // tipo de documento, en la misma transacción que el dinero.
  let documentId: string | null = null;
  if (status === "APPROVED" && input.sourceType !== "INVOICE" && !input.skipDocument) {
    const customer = input.customerId
      ? await tx.orm.public.Customer.where({ tenantId, id: input.customerId }).select("name").first()
      : null;
    const doc = await insertDocument(
      tx,
      tenantId,
      {
        kind: "SALE",
        status: "PAID",
        customerId: input.customerId ?? null,
        customerName: customer?.name ?? "Cliente de mostrador",
        originType: input.sourceType ?? null,
        originId: input.sourceId ?? null,
        paymentId: payment.id,
        lines: input.documentLines?.length
          ? input.documentLines
          : [{ description: input.description || `Recibo ${receipt}`, quantity: 1, unitPrice: Number(amount) }],
      },
      userId,
    );
    documentId = doc.id;
    await emitEvent(tx, tenantId, {
      type: "sale.completed",
      resourceType: "payment",
      resourceId: payment.id,
      payload: {
        payment_id: payment.id,
        receipt: receipt,
        amount,
        currency: "COP",
        method: input.method,
        customer_id: input.customerId ?? null,
        document_id: documentId,
        source_type: input.sourceType ?? null,
        source_id: input.sourceId ?? null,
      },
    });
  }
  return { paymentId: payment.id, receiptNumber, receipt, createdAt: String(payment.createdAt), documentId };
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

// --- Operaciones --------------------------------------------------------------

/** Paga una factura o cuenta de cobro. `null` si ya no está emitida (pagada, anulada o en otro clic). */
export async function payInvoice(tenantId: string, id: string, method: string, userId: string) {
  try {
    return await moneyTransaction(async (tx) => {
      const inv = await tx.orm.public.Invoice.where({ tenantId, id })
        .select("id", "kind", "number", "customerId", "customerName", "total", "paidTotal")
        .first();
      if (!inv || !(await claimInvoice(tx, tenantId, id))) throw new MoneyError("Solo se pagan documentos emitidos.");
      // Si ya tenía abonos, se cobra solo lo que falta y la cuenta queda saldada.
      const balance = balanceOf(toNumber(inv.total), toNumber(inv.paidTotal));
      await tx.orm.public.Invoice.where({ tenantId, id }).update({ paidTotal: toNumber(inv.total).toFixed(2) });
      const income = await recordIncome(
        tx,
        tenantId,
        {
          amount: balance.toFixed(2),
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

/**
 * Abono a una cuenta de cobro emitida: el pago con su recibo, la caja y el nuevo
 * saldo se escriben juntos. Si el abono salda la cuenta, queda pagada. Dos abonos
 * a la vez no se pisan: el UPDATE exige que lo abonado siga siendo lo que se leyó.
 */
export async function receiveInvoicePayment(
  tenantId: string,
  id: string,
  amount: number,
  method: string,
  userId: string,
): Promise<{ ok: true; receipt: string; balance: number; settled: boolean } | { ok: false; message: string }> {
  try {
    return await moneyTransaction(async (tx) => {
      const inv = await tx.orm.public.Invoice.where({ tenantId, id })
        .select("id", "kind", "number", "customerId", "customerName", "total", "paidTotal", "status")
        .first();
      if (!inv || inv.kind !== "BILL" || inv.status !== "ISSUED") throw new MoneyError("Solo se abonan cuentas de cobro emitidas.");
      const total = toNumber(inv.total);
      const paidBefore = toNumber(inv.paidTotal);
      const balance = balanceOf(total, paidBefore);
      const problem = validatePayment(amount, balance);
      if (problem) throw new MoneyError(problem);
      const paid = Math.round((paidBefore + amount) * 100) / 100;
      const settled = paid >= total;
      const plan = tx.sql.public.Invoice.update({ paidTotal: paid.toFixed(2), ...(settled ? { status: "PAID" as const } : {}) })
        .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "ISSUED"), fns.eq(f.paidTotal, paidBefore.toFixed(2))))
        .returning("id")
        .build();
      if ((await tx.query(plan)).length === 0) throw new MoneyError("La cuenta cambió mientras abonabas. Vuelve a intentarlo.");
      const income = await recordIncome(
        tx,
        tenantId,
        {
          amount,
          method,
          customerId: inv.customerId,
          invoiceId: inv.id,
          description: `Abono a cuenta de cobro N.º ${inv.number} · ${inv.customerName}`,
          cashDescription: `Abono a cuenta N.º ${inv.number}`,
          sourceType: "INVOICE",
          sourceId: inv.id,
        },
        userId,
      );
      return { ok: true as const, receipt: income.receipt, balance: Math.round((balance - amount) * 100) / 100, settled };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false as const, message: e.message };
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
          documentLines: [{ description: input.name, quantity: input.quantity, unitPrice: input.price, productId: input.productId }],
        },
        userId,
      );
      if (input.trackStock) {
        // Descuenta de la bodega con su costo promedio y deja la línea del kardex (misma transacción que el cobro).
        try {
          await applyStockMovement(tx, tenantId, { productId: input.productId, kind: "SALE", quantity: input.quantity, note: `Venta ${income.receipt}`, paymentId: income.paymentId, userId, documentType: "SALE", documentId: income.paymentId });
        } catch (e) {
          if (e instanceof StockError) throw new MoneyError(e.message);
          throw e;
        }
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
      // Contabilidad: el asiento del cobro se reversa (el libro no se edita, se corrige con otro asiento).
      await reverseSource(tx, tenantId, "PAYMENT", paymentId, reason, userId);
      // Anular un abono (o el pago) de una cuenta de cobro la devuelve a la cartera.
      if (p.invoiceId && p.sourceType === "INVOICE") {
        const inv = await tx.orm.public.Invoice.where({ tenantId, id: p.invoiceId }).select("status", "paidTotal").first();
        if (inv && inv.status !== "VOID") {
          const paid = Math.max(0, Math.round((toNumber(inv.paidTotal) - toNumber(p.amount)) * 100) / 100);
          await tx.orm.public.Invoice.where({ tenantId, id: p.invoiceId }).update({ paidTotal: paid.toFixed(2), status: "ISSUED" });
        }
      }
      // Anular no borra la venta: emite su nota crédito (documento comercial).
      const sale = await saleDocumentOfPayment(tx, tenantId, paymentId);
      if (sale) await issueCreditNote(tx, tenantId, sale.id, reason, userId);
      return { ok: true as const };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false as const, message: e.message };
    throw e;
  }
}

/**
 * Anula un gasto una sola vez (con motivo). Si el efectivo salió de una caja
 * que sigue abierta, el mismo movimiento lo devuelve a la caja. La guarda
 * `voidedAt IS NULL` en la actualización hace que dos anulaciones a la vez
 * dejen un solo reintegro.
 */
export async function voidExpense(tenantId: string, expenseId: string, reason: string, userId: string) {
  try {
    return await moneyTransaction(async (tx) => {
      const e = await tx.orm.public.Expense.where({ tenantId, id: expenseId }).first();
      if (!e) throw new MoneyError("El gasto no existe.");
      if (e.voidedAt) throw new MoneyError("El gasto ya está anulado.");
      const updated = await tx.orm.public.Expense.where({ tenantId, id: expenseId })
        .where((f) => f.voidedAt.isNull())
        .updateAndCount({ voidedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()), voidReason: reason });
      if (updated === 0) throw new MoneyError("El gasto ya está anulado.");
      if (e.cashSessionId) {
        const session = await tx.orm.public.CashSession.where({ tenantId, id: e.cashSessionId }).select("closedAt").first();
        if (session && !session.closedAt) {
          await tx.orm.public.CashMovement.create({
            tenantId,
            sessionId: e.cashSessionId,
            kind: "ADJUST",
            amount: toNumber(e.amount).toFixed(2),
            description: `Anulación de gasto: ${e.description}`,
            beneficiary: null,
            paymentId: null,
            expenseId,
            createdById: userId,
          });
        }
      }
      return { ok: true as const, amount: String(e.amount) };
    });
  } catch (err) {
    if (err instanceof MoneyError) return { ok: false as const, message: err.message };
    throw err;
  }
}
