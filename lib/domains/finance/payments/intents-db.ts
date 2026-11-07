import { MoneyError, emitFinanceEvent, moneyTransaction, recordIncome, type MoneyTx } from "@/lib/business/sales/money-service";
import { sandboxPaymentsAllowed } from "@/lib/foundation/environment";
import { toNumber } from "@/lib/foundation/format";
import { balanceOf } from "@/lib/foundation/kernel/aging";
import { todayCO } from "@/lib/domains/finance/tax/tax";
import { checkoutPort } from "./checkout-port";
import { settleStoreOrder, storeOrderLines } from "@/lib/business/store/store-settle";
import { db } from "@/prisma/db";
import { effectiveStatus, newReference, pickGateway, reconcile, validateIntent, validateProof, validateRejection, type IntentStatus, type Reconciliation, type ReportRow } from "./intents";

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
  /** Lo que escribió el cliente al avisar su transferencia, y cuándo. */
  proofNote: string | null;
  proofAt: string | null;
  rejectionReason: string | null;
  /** Intentos fallidos que reportó la pasarela y cómo terminó el último. */
  failedAttempts: number;
  lastAttemptResult: "DECLINED" | "ERROR" | "VOIDED" | null;
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
  proofNote: (i.proofNote as string | null) ?? null,
  proofAt: i.proofAt ? String(i.proofAt) : null,
  rejectionReason: (i.rejectionReason as string | null) ?? null,
  failedAttempts: 0,
  lastAttemptResult: null,
});

/**
 * Crea una intención de cobro con su referencia. La pasarela es la pedida si el negocio la tiene conectada, si no la
 * primera conectada y, sin ninguna, el cobro manual: nunca la de prueba por omisión. Valida valor y vigencia, que la cuenta de cobro vinculada esté emitida y que el cobro no supere su saldo, y que el cliente exista.
 */
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
  const provider = pickGateway((await connectedGateways(tenantId)).map((g) => g.value), input.provider);
  const created = await db.orm.public.PaymentIntent.create({ tenantId, reference: newReference(), amount: dec(input.amount), description: input.description.trim().slice(0, 160), channel: input.channel ?? "LINK", provider, customerId: input.customerId ?? null, invoiceId: input.invoiceId ?? null, expiresAt: instant(Date.now() + hours * 3_600_000), createdById: userId });
  await db.transaction((tx) => emitFinanceEvent(tx, tenantId, { type: "payment.intent_created", resourceType: "payment_intent", resourceId: created.id, payload: { intent_id: created.id, reference: created.reference, amount: input.amount, currency: "COP", provider } }));
  return { ok: true, id: created.id, reference: created.reference };
}

/** Intenciones de cobro del negocio, las más recientes primero (100 por defecto). */
export async function listIntents(tenantId: string, limit = 100): Promise<IntentRow[]> {
  const rows = await db.orm.public.PaymentIntent.where({ tenantId }).orderBy((i) => i.createdAt.desc()).limit(limit).all();
  const attempts = rows.length ? await db.orm.public.PaymentAttempt.where({ tenantId }).where((a) => a.intentId.in(rows.map((r) => r.id))).select("intentId", "result", "createdAt").all() : [];
  return rows.map((r) => {
    const mine = attempts.filter((a) => a.intentId === r.id).sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));
    return { ...toRow(r as unknown as Record<string, unknown>), failedAttempts: mine.length, lastAttemptResult: (mine[0]?.result as AttemptResult | undefined) ?? null };
  });
}

/** Lo que ve quien abre el enlace público: el negocio, el valor, la descripción y el estado; nada más. */
export async function publicIntent(reference: string): Promise<{ business: string; amount: number; description: string; status: IntentStatus; expiresAt: string; payUrl: string | null } | null> {
  if (!/^[a-z0-9]{10,30}$/.test(reference)) return null;
  const i = await db.orm.public.PaymentIntent.where({ reference }).first();
  if (!i) return null;
  const shop = await db.orm.public.Tenant.where({ id: i.tenantId }).select("name").first();
  const row = toRow(i as unknown as Record<string, unknown>);
  return { business: shop?.name ?? "", amount: row.amount, description: row.description, status: row.status, expiresAt: row.expiresAt, payUrl: row.status === "PENDING" ? await checkoutUrlOf(i.tenantId, row) : null };
}

/** Enlace del checkout alojado de la pasarela (hoy Wompi) para un cobro pendiente; `null` si no hay pasarela conectada. */
async function checkoutUrlOf(tenantId: string, row: IntentRow): Promise<string | null> {
  if (row.provider !== "wompi") return null;
  const conn = await db.orm.public.ExternalConnection.where({ tenantId, kind: "PAYMENT", provider: "wompi", status: "CONNECTED" }).first();
  if (!conn?.credentialsEnc) return null;
  try {
    return checkoutPort.use().hostedCheckoutUrl({ provider: row.provider, credentialsEnc: conn.credentialsEnc, reference: row.reference, amount: row.amount });
  } catch {
    return null;
  }
}

/** Pasarelas de cobro que el negocio tiene conectadas (para elegir al crear un cobro). */
export async function connectedGateways(tenantId: string): Promise<{ value: string; label: string }[]> {
  const rows = await db.orm.public.ExternalConnection.where({ tenantId, kind: "PAYMENT", status: "CONNECTED" }).all();
  const allowSandbox = sandboxPaymentsAllowed();
  return rows.filter((r) => allowSandbox || r.provider !== "sandbox").map((r) => ({ value: r.provider, label: r.provider === "wompi" ? "Wompi" : r.provider === "sandbox" ? "Pasarela de prueba" : r.provider }));
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
        .where((f, fns) => fns.and(fns.eq(f.id, intent.id), fns.eq(f.tenantId, tenantId), fns.or(fns.eq(f.status, "PENDING"), fns.eq(f.status, "VERIFYING"))))
        .returning("id")
        .build();
      if ((await tx.query(claim)).length === 0) return { ok: true as const, already: true };
      if (intent.invoiceId) await applyToInvoice(tx, tenantId, intent.invoiceId, amount);
      // Un cobro de la tienda deja SU documento de venta con las líneas del pedido y descuenta existencias.
      const store = await storeOrderLines(tx, tenantId, intent.id);
      const income = await recordIncome(tx, tenantId, { documentLines: store?.lines, amount, method: by.kind === "PROVIDER" ? "WOMPI" : "TRANSFER", customerId: intent.customerId, invoiceId: intent.invoiceId, description: `Cobro en línea · ${intent.description}`, providerRefId: by.kind === "PROVIDER" ? by.externalId : null, sourceType: intent.invoiceId ? "INVOICE" : "ONLINE", sourceId: intent.invoiceId ?? intent.id }, by.kind === "MANUAL" ? by.userId : "proveedor");
      await tx.orm.public.PaymentIntent.where({ tenantId, id: intent.id }).update({ paymentId: income.paymentId });
      if (store) await settleStoreOrder(tx, tenantId, store.orderId, income.documentId, by.kind === "MANUAL" ? by.userId : null, { id: income.paymentId, amount });
      return { ok: true as const, already: false };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false, message: e.message };
    throw e;
  }
}

/** Cancela una intención pendiente de forma atómica. Devuelve `false` si no existe o ya no está pendiente. */
export async function cancelIntent(tenantId: string, id: string): Promise<boolean> {
  const i = await db.orm.public.PaymentIntent.where({ tenantId, id }).first();
  if (!i || i.status !== "PENDING") return false;
  const plan = db.sql.public.PaymentIntent.update({ status: "CANCELED" }).where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "PENDING"))).returning("id").build();
  return (await db.transaction((tx) => tx.query(plan))).length > 0;
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
export async function handlePaymentEvent(tenantId: string, event: { type: string; externalId: string; paymentRef?: string | null; reference?: string | null; amount?: string | null }): Promise<string | null> {
  if (!event.reference) return null;
  if (event.type === "payment.succeeded") {
    const r = await confirmIntent(tenantId, event.reference, { kind: "PROVIDER", externalId: event.paymentRef ?? event.externalId, amount: Number(event.amount ?? NaN) });
    return r.ok ? null : r.message;
  }
  if (event.type === "payment.failed" || event.type === "payment.voided") {
    // Un rechazo es un INTENTO, no el fin del cobro: queda registrado y el cobro sigue abierto para que el cliente reintente.
    await recordAttempt(tenantId, event.reference, { provider: "wompi", externalId: event.externalId, result: event.type === "payment.voided" ? "VOIDED" : "DECLINED", amount: event.amount ?? null });
  }
  return null;
}

export type AttemptResult = "DECLINED" | "ERROR" | "VOIDED";
export type AttemptRow = { id: string; provider: string; externalId: string; result: AttemptResult; amount: number | null; createdAt: string };

/** Registra un intento fallido de un cobro abierto. El mismo aviso repetido no lo duplica. Un cobro ya pagado o cerrado no lo recibe. */
export async function recordAttempt(tenantId: string, reference: string, input: { provider: string; externalId: string; result: AttemptResult; amount?: string | null }): Promise<boolean> {
  const intent = await db.orm.public.PaymentIntent.where({ tenantId, reference }).select("id", "status", "provider").first();
  if (!intent || (intent.status !== "PENDING" && intent.status !== "VERIFYING")) return false;
  const exists = await db.orm.public.PaymentAttempt.where({ tenantId, intentId: intent.id, externalId: input.externalId }).select("id").first();
  if (exists) return false;
  const amount = input.amount != null && Number.isFinite(Number(input.amount)) ? Number(input.amount).toFixed(2) : null;
  try {
    await db.orm.public.PaymentAttempt.create({ tenantId, intentId: intent.id, provider: intent.provider || input.provider, externalId: input.externalId.slice(0, 120), result: input.result, amount });
    return true;
  } catch (error) {
    if (/PaymentAttempt_tenantId_intentId_externalId|unique|duplicate/i.test(String((error as Error)?.message ?? error))) return false;
    throw error;
  }
}

/** Intentos de un cobro, el más reciente primero. */
export async function listAttempts(tenantId: string, intentId: string): Promise<AttemptRow[]> {
  const rows = await db.orm.public.PaymentAttempt.where({ tenantId, intentId }).orderBy((a) => a.createdAt.desc()).limit(50).all();
  return rows.map((r) => ({ id: r.id, provider: r.provider, externalId: r.externalId, result: r.result as AttemptResult, amount: r.amount == null ? null : toNumber(r.amount), createdAt: String(r.createdAt) }));
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

/** Últimas conciliaciones con la pasarela (15 por defecto): día, valor esperado y valor reportado. */
export async function listReconciliations(tenantId: string, limit = 15) {
  const rows = await db.orm.public.ReconciliationRun.where({ tenantId }).orderBy((r) => r.createdAt.desc()).limit(limit).all();
  return rows.map((r) => ({ id: r.id, provider: r.provider, day: r.day, expected: toNumber(r.expected), reported: toNumber(r.reported), matched: r.matched, differences: (r.differences ?? []) as unknown as Reconciliation["differences"] }));
}

export type ProofResult = { ok: true } | { ok: false; message: string };

/**
 * El cliente avisa que pagó por transferencia (enlace público). El cobro pasa a «en verificación» con lo que escribió; NO se
 * registra ningún ingreso: solo una persona autorizada (`confirmIntent`) o el proveedor lo confirman. Un cobro que no está
 * pendiente, o que ya venció, no admite aviso.
 */
export async function submitProof(reference: string, note: string): Promise<ProofResult> {
  if (!/^[a-z0-9]{10,30}$/.test(reference)) return { ok: false, message: "El enlace no es válido." };
  const problem = validateProof(note);
  if (problem) return { ok: false, message: problem };
  const intent = await db.orm.public.PaymentIntent.where({ reference }).first();
  if (!intent) return { ok: false, message: "El enlace no es válido." };
  if (effectiveStatus(String(intent.status), String(intent.expiresAt)) !== "PENDING") return { ok: false, message: "Este cobro ya no está pendiente." };
  const plan = db.sql.public.PaymentIntent.update({ status: "VERIFYING", proofNote: note.trim().slice(0, 200), proofAt: instant(Date.now()), rejectionReason: null })
    .where((f, fns) => fns.and(fns.eq(f.id, intent.id), fns.eq(f.status, "PENDING")))
    .returning("id")
    .build();
  if ((await db.transaction((tx) => tx.query(plan))).length === 0) return { ok: false, message: "Este cobro ya no está pendiente." };
  return { ok: true };
}

/** Una persona autorizada rechaza el comprobante con un motivo: el cobro vuelve a pendiente para que el cliente reintente. */
export async function rejectProof(tenantId: string, id: string, reason: string): Promise<ProofResult> {
  const problem = validateRejection(reason);
  if (problem) return { ok: false, message: problem };
  const plan = db.sql.public.PaymentIntent.update({ status: "PENDING", rejectionReason: reason.trim().slice(0, 200) })
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "VERIFYING")))
    .returning("id")
    .build();
  if ((await db.transaction((tx) => tx.query(plan))).length === 0) return { ok: false, message: "Solo se rechazan los cobros en verificación." };
  return { ok: true };
}
