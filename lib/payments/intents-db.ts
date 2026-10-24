import { MoneyError, moneyTransaction, recordIncome, type MoneyTx } from "@/lib/business/money-service";
import { toNumber } from "@/lib/format";
import { balanceOf } from "@/lib/receivables/aging";
import { todayCO } from "@/lib/tax/tax";
import { db } from "@/prisma/db";
import { effectiveStatus, newReference, reconcile, validateIntent, type IntentStatus, type Reconciliation, type ReportRow } from "./intents";

/**
 * Cobros en línea (servidor). Una intención de cobro se vuelve ingreso solo con el estado
 * OFICIAL: el webhook firmado del proveedor (monto igual al pedido) o la confirmación manual
 * de una persona autorizada con evidencia. Confirmar dos veces lo mismo es imposible: el
 * UPDATE exige que siga pendiente y la referencia del proveedor es única. Todo por `tenantId`.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;
const dec = (n: number) => n.toFixed(2);
const instant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);

export type IntentRow = {
  id: string;
  reference: string;
  amount: number;
  description: string;
  status: IntentStatus;
  channel: string;
  provider: string;
  invoiceId: string | null;
  expiresAt: string;
  paidAt: string | null;
  confirmedBy: string | null;
  refundedTotal: number;
  createdAt: string;
};

const toRow = (i: Record<string, unknown>, now = Date.now()): IntentRow => ({
  id: String(i.id),
  reference: String(i.reference),
  amount: toNumber(i.amount as never),
  description: String(i.description),
  status: effectiveStatus(String(i.status), String(i.expiresAt), now),
  channel: String(i.channel),
  provider: String(i.provider),
  invoiceId: (i.invoiceId as string | null) ?? null,
  expiresAt: String(i.expiresAt),
  paidAt: i.paidAt ? String(i.paidAt) : null,
  confirmedBy: (i.confirmedBy as string | null) ?? null,
  refundedTotal: toNumber(i.refundedTotal as never),
  createdAt: String(i.createdAt),
});

export async function createIntent(tenantId: string, input: { amount: number; description: string; expiresInHours?: number; customerId?: string | null; invoiceId?: string | null; channel?: "LINK" | "QR"; provider?: string }, userId: string): Promise<{ ok: true; id: string; reference: string } | { ok: false; message: string }> {
  const hours = input.expiresInHours ?? 48;
  const problem = validateIntent({ amount: input.amount, description: input.description, expiresInHours: hours });
  if (problem) return { ok: false, message: problem };
  if (input.invoiceId) {
    const inv = await db.orm.public.Invoice.where({ tenantId, id: input.invoiceId }).select("kind", "status", "total", "paidTotal").first();
    if (!inv || inv.kind !== "BILL" || inv.status !== "ISSUED") return { ok: false, message: "La cuenta de cobro no existe o ya no está emitida." };
    if (input.amount > balanceOf(toNumber(inv.total), toNumber(inv.paidTotal))) return { ok: false, message: "El cobro no puede ser mayor que el saldo de la cuenta." };
  }
  if (input.customerId && !(await db.orm.public.Customer.where({ tenantId, id: input.customerId }).select("id").first())) return { ok: false, message: "El cliente no existe." };
  const created = await db.orm.public.PaymentIntent.create({ tenantId, reference: newReference(), amount: dec(input.amount), description: input.description.trim().slice(0, 160), channel: input.channel ?? "LINK", provider: input.provider ?? "sandbox", customerId: input.customerId ?? null, invoiceId: input.invoiceId ?? null, expiresAt: instant(Date.now() + hours * 3_600_000), createdById: userId });
  return { ok: true, id: created.id, reference: created.reference };
}

export async function listIntents(tenantId: string, limit = 100): Promise<IntentRow[]> {
  const rows = await db.orm.public.PaymentIntent.where({ tenantId }).orderBy((i) => i.createdAt.desc()).limit(limit).all();
  return rows.map((r) => toRow(r as unknown as Record<string, unknown>));
}

/** Lo que ve quien abre el enlace público: el negocio, el valor, la descripción y el estado; nada más. */
export async function publicIntent(reference: string): Promise<{ business: string; amount: number; description: string; status: IntentStatus; expiresAt: string } | null> {
  if (!/^[a-z0-9]{10,30}$/.test(reference)) return null;
  const i = await db.orm.public.PaymentIntent.where({ reference }).first();
  if (!i) return null;
  const shop = await db.orm.public.Tenant.where({ id: i.tenantId }).select("name").first();
  const row = toRow(i as unknown as Record<string, unknown>);
  return { business: shop?.name ?? "", amount: row.amount, description: row.description, status: row.status, expiresAt: row.expiresAt };
}

/** Baja el saldo de una cuenta de cobro dentro de la transacción del cobro. */
async function applyToInvoice(tx: MoneyTx, tenantId: string, invoiceId: string, amount: number) {
  const inv = await tx.orm.public.Invoice.where({ tenantId, id: invoiceId }).select("kind", "status", "total", "paidTotal").first();
  if (!inv || inv.kind !== "BILL" || inv.status !== "ISSUED") throw new MoneyError("La cuenta de cobro ya no está emitida.");
  const paidBefore = toNumber(inv.paidTotal);
  const balance = balanceOf(toNumber(inv.total), paidBefore);
  if (amount > balance) throw new MoneyError("El cobro es mayor que el saldo de la cuenta.");
  const paid = round2(paidBefore + amount);
  const plan = tx.sql.public.Invoice.update({ paidTotal: dec(paid), ...(paid >= toNumber(inv.total) ? { status: "PAID" as const } : {}) })
    .where((f, fns) => fns.and(fns.eq(f.id, invoiceId), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "ISSUED"), fns.eq(f.paidTotal, dec(paidBefore))))
    .returning("id")
    .build();
  if ((await tx.query(plan)).length === 0) throw new MoneyError("La cuenta cambió mientras se confirmaba el cobro.");
}

export type ConfirmResult = { ok: true; already: boolean } | { ok: false; message: string };

/**
 * Confirma el cobro con el estado oficial. `PROVIDER`: exige id externo y el monto exacto.
 * `MANUAL`: exige evidencia escrita (referencia de la transferencia). Idempotente: un cobro ya
 * pagado responde `already` sin volver a registrar el ingreso.
 */
export async function confirmIntent(tenantId: string, reference: string, by: { kind: "PROVIDER"; externalId: string; amount: number } | { kind: "MANUAL"; evidence: string; userId: string }): Promise<ConfirmResult> {
  try {
    return await moneyTransaction(async (tx) => {
      const intent = await tx.orm.public.PaymentIntent.where({ tenantId, reference }).first();
      if (!intent) throw new MoneyError("El cobro no existe.");
      if (intent.status === "PAID") return { ok: true as const, already: true };
      if (intent.status === "CANCELED" || intent.status === "FAILED") throw new MoneyError("El cobro está cancelado o fallido.");
      const amount = toNumber(intent.amount);
      if (by.kind === "PROVIDER" && round2(by.amount) !== amount) throw new MoneyError(`El monto reportado (${by.amount}) no coincide con el cobro (${amount}).`);
      if (by.kind === "MANUAL" && by.evidence.trim().length < 4) throw new MoneyError("Escribe la referencia o evidencia de la transferencia.");
      // Reclamo único: solo pasa de pendiente (o vencido sin cancelar) a pagado una vez.
      const claim = tx.sql.public.PaymentIntent.update({ status: "PAID", paidAt: instant(Date.now()), confirmedBy: by.kind, evidence: by.kind === "MANUAL" ? by.evidence.trim().slice(0, 200) : null, providerRefId: by.kind === "PROVIDER" ? by.externalId : null })
        .where((f, fns) => fns.and(fns.eq(f.id, intent.id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "PENDING")))
        .returning("id")
        .build();
      if ((await tx.query(claim)).length === 0) return { ok: true as const, already: true };
      if (intent.invoiceId) await applyToInvoice(tx, tenantId, intent.invoiceId, amount);
      const income = await recordIncome(tx, tenantId, { amount, method: by.kind === "PROVIDER" ? "WOMPI" : "TRANSFER", customerId: intent.customerId, invoiceId: intent.invoiceId, description: `Cobro en línea · ${intent.description}`, providerRefId: by.kind === "PROVIDER" ? by.externalId : null, sourceType: intent.invoiceId ? "INVOICE" : "ONLINE", sourceId: intent.invoiceId ?? intent.id }, by.kind === "MANUAL" ? by.userId : "proveedor");
      await tx.orm.public.PaymentIntent.where({ tenantId, id: intent.id }).update({ paymentId: income.paymentId });
      return { ok: true as const, already: false };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false, message: e.message };
    throw e;
  }
}

export async function cancelIntent(tenantId: string, id: string): Promise<boolean> {
  const i = await db.orm.public.PaymentIntent.where({ tenantId, id }).first();
  if (!i || i.status !== "PENDING") return false;
  const plan = db.sql.public.PaymentIntent.update({ status: "CANCELED" }).where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "PENDING"))).returning("id").build();
  const rows = await db.runtime().execute(plan);
  void rows;
  return true;
}

/**
 * Reembolso total o parcial de un cobro pagado: no puede pasar de lo cobrado menos lo ya
 * reembolsado. Si el cobro pagaba una cuenta de cobro, su saldo vuelve a subir.
 */
export async function refundIntent(tenantId: string, id: string, amount: number, reason: string, userId: string): Promise<{ ok: true; remaining: number } | { ok: false; message: string }> {
  if (reason.trim().length < 3) return { ok: false, message: "Escribe el motivo del reembolso." };
  try {
    return await moneyTransaction(async (tx) => {
      const i = await tx.orm.public.PaymentIntent.where({ tenantId, id }).first();
      if (!i || i.status !== "PAID") throw new MoneyError("Solo se reembolsan cobros pagados.");
      const paid = toNumber(i.amount);
      const refunded = toNumber(i.refundedTotal);
      if (!(amount > 0)) throw new MoneyError("El valor debe ser mayor que cero.");
      if (round2(amount) > round2(paid - refunded)) throw new MoneyError(`Solo se puede reembolsar ${round2(paid - refunded).toLocaleString("es-CO")}.`);
      const next = round2(refunded + amount);
      const guard = tx.sql.public.PaymentIntent.update({ refundedTotal: dec(next) })
        .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.refundedTotal, dec(refunded))))
        .returning("id")
        .build();
      if ((await tx.query(guard)).length === 0) throw new MoneyError("El cobro cambió mientras se reembolsaba. Inténtalo de nuevo.");
      await tx.orm.public.PaymentRefund.create({ tenantId, intentId: id, amount: dec(amount), reason: reason.trim().slice(0, 200), createdById: userId });
      if (i.invoiceId) {
        const inv = await tx.orm.public.Invoice.where({ tenantId, id: i.invoiceId }).select("status", "paidTotal").first();
        if (inv && inv.status !== "VOID") await tx.orm.public.Invoice.where({ tenantId, id: i.invoiceId }).update({ paidTotal: dec(Math.max(0, round2(toNumber(inv.paidTotal) - amount))), status: "ISSUED" });
      }
      return { ok: true as const, remaining: round2(paid - next) };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false, message: e.message };
    throw e;
  }
}

/** Reacciona al evento ya verificado de un proveedor de pagos. Devuelve un aviso (o `null`) si algo no cuadró. */
export async function handlePaymentEvent(tenantId: string, event: { type: string; externalId: string; reference?: string | null; amount?: string | null }): Promise<string | null> {
  if (!event.reference) return null;
  if (event.type === "payment.succeeded") {
    const r = await confirmIntent(tenantId, event.reference, { kind: "PROVIDER", externalId: event.externalId, amount: Number(event.amount ?? NaN) });
    return r.ok ? null : r.message;
  }
  if (event.type === "payment.failed") {
    const plan = db.sql.public.PaymentIntent.update({ status: "FAILED" }).where((f, fns) => fns.and(fns.eq(f.reference, event.reference!), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "PENDING"))).returning("id").build();
    await db.runtime().execute(plan);
  }
  return null;
}

/**
 * Conciliación de un día: lo que NEXUS confirmó por el proveedor ese día contra el reporte
 * que se pega. Guarda la corrida con sus diferencias para revisarlas.
 */
export async function runReconciliation(tenantId: string, provider: string, day: string, reported: readonly ReportRow[], userId: string): Promise<{ ok: true; id: string; result: Reconciliation } | { ok: false; message: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, message: "Elige el día a conciliar." };
  const paid = await db.orm.public.PaymentIntent.where({ tenantId, provider, status: "PAID", confirmedBy: "PROVIDER" }).all();
  const ours = paid.filter((p) => p.paidAt && todayCO(new Date(String(p.paidAt)).getTime()) === day && p.providerRefId).map((p) => ({ externalId: p.providerRefId!, amount: toNumber(p.amount) }));
  const result = reconcile(ours, reported);
  const run = await db.orm.public.ReconciliationRun.create({ tenantId, provider, day, expected: dec(result.expectedTotal), reported: dec(result.reportedTotal), differences: result.differences as never, matched: result.matched, createdById: userId });
  return { ok: true, id: run.id, result };
}

export async function listReconciliations(tenantId: string, limit = 15) {
  const rows = await db.orm.public.ReconciliationRun.where({ tenantId }).orderBy((r) => r.createdAt.desc()).limit(limit).all();
  return rows.map((r) => ({ id: r.id, provider: r.provider, day: r.day, expected: toNumber(r.expected), reported: toNumber(r.reported), matched: r.matched, differences: (r.differences ?? []) as unknown as Reconciliation["differences"] }));
}
