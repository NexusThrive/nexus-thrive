import { createHash } from "node:crypto";
import { cache } from "react";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import {
  DEFAULT_POLICY,
  dunning,
  periodAmount,
  periodEnd,
  type BillingPolicyValues,
  type ChargeStatusValue,
  type Cycle,
  type Dunning,
  type SubscriptionStatusValue,
} from "./billing-rules";
import { todayBogota } from "./leads";

/** Facturación de NEXUS a sus negocios: acceso a datos (servidor). */

const at = (d: string) => Temporal.Instant.from(`${d}T12:00:00Z`);
const day = (v: unknown) => (v ? String(v).slice(0, 10) : null);
const now = () => Temporal.Instant.fromEpochMilliseconds(Date.now());
/** Motivo con el que se suspende por falta de pago (permite reactivar solo). */
export const NONPAYMENT_REASON = "Falta de pago";

/** Política vigente; la primera vez se siembra (idempotente: varias lecturas en paralelo no chocan). */
export const getPolicy = cache(async (): Promise<BillingPolicyValues> => {
  const row = await db.orm.public.BillingPolicy.where({ id: "default" }).first();
  if (row) return { reminderDays: [...(row.reminderDays ?? [])], graceDays: row.graceDays, noticeDays: row.noticeDays };
  await db.orm.public.BillingPolicy.upsert({ create: { id: "default", ...DEFAULT_POLICY }, update: {}, conflictOn: { id: "default" } });
  return { ...DEFAULT_POLICY };
});

export async function savePolicy(p: BillingPolicyValues) {
  await getPolicy();
  await db.orm.public.BillingPolicy.where({ id: "default" }).update(p);
}

export type ChargeRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantActive: boolean;
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  amountUsdCents: number;
  status: ChargeStatusValue;
  dueDate: string;
  method: string | null;
  reference: string | null;
  paidDate: string | null;
  confirmedDate: string | null;
  confirmedByName: string | null;
  recordedByName: string | null;
  noticeDate: string | null;
  refundReason: string | null;
  voidReason: string | null;
  notes: string | null;
  evidence: { id: string; fileName: string; mimeType: string; byteSize: number; createdAt: string }[];
  dunning: Dunning;
};

export type SubscriptionRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantActive: boolean;
  plan: string;
  billingCycle: Cycle;
  priceUsdCents: number;
  status: SubscriptionStatusValue;
  /** Estado mostrado: "en mora" se deriva de los cobros vencidos. */
  displayStatus: SubscriptionStatusValue;
  periodStart: string;
  periodEnd: string;
  nextChargeExists: boolean;
  notes: string | null;
};

async function names() {
  const [tenants, staff] = await Promise.all([
    db.orm.public.Tenant.select("id", "name", "active").all(),
    db.orm.public.StaffMember.select("id", "name", "email").all(),
  ]);
  return {
    tenant: new Map(tenants.map((t) => [t.id, t])),
    staff: new Map(staff.map((s) => [s.id, s.name ?? s.email])),
  };
}

export async function listCharges(filter: { tenantId?: string; chargeId?: string } = {}): Promise<ChargeRow[]> {
  let q = db.orm.public.Charge.orderBy((c) => c.dueAt.desc());
  if (filter.tenantId) q = q.where({ tenantId: filter.tenantId });
  if (filter.chargeId) q = q.where({ id: filter.chargeId });
  const [charges, n, policy] = await Promise.all([q.all(), names(), getPolicy()]);
  const ids = charges.map((c) => c.id);
  const evidence = ids.length
    ? await db.orm.public.ChargeEvidence.where((e) => e.chargeId.in(ids)).select("id", "chargeId", "fileName", "mimeType", "byteSize", "createdAt").orderBy((e) => e.createdAt.asc()).all()
    : [];
  const today = todayBogota();
  return charges.map((c) => {
    const t = n.tenant.get(c.tenantId);
    const row = {
      id: c.id,
      tenantId: c.tenantId,
      tenantName: t?.name ?? "Negocio eliminado",
      tenantActive: t?.active ?? false,
      subscriptionId: c.subscriptionId,
      periodStart: day(c.periodStart)!,
      periodEnd: day(c.periodEnd)!,
      amountUsdCents: c.amountUsdCents,
      status: c.status as ChargeStatusValue,
      dueDate: day(c.dueAt)!,
      method: c.method,
      reference: c.reference,
      paidDate: day(c.paidAt),
      confirmedDate: day(c.confirmedAt),
      confirmedByName: c.confirmedById ? (n.staff.get(c.confirmedById) ?? null) : null,
      recordedByName: c.recordedById ? (n.staff.get(c.recordedById) ?? null) : null,
      noticeDate: day(c.noticeSentAt),
      refundReason: c.refundReason,
      voidReason: c.voidReason,
      notes: c.notes,
      evidence: evidence.filter((e) => e.chargeId === c.id).map((e) => ({ id: e.id, fileName: e.fileName, mimeType: e.mimeType, byteSize: e.byteSize, createdAt: String(e.createdAt) })),
    };
    return { ...row, dunning: dunning({ status: row.status, dueDate: row.dueDate, noticeDate: row.noticeDate }, policy, today) };
  });
}

export async function getCharge(id: string) {
  return (await listCharges({ chargeId: id }))[0] ?? null;
}

const OVERDUE = new Set(["grace", "notice_needed", "notice_running", "suspend_eligible"]);

export async function listSubscriptions(): Promise<SubscriptionRow[]> {
  const [subs, n, charges] = await Promise.all([db.orm.public.Subscription.orderBy((s) => s.currentPeriodEnd.asc()).all(), names(), listCharges()]);
  return subs.map((s) => {
    const mine = charges.filter((c) => c.subscriptionId === s.id);
    const overdue = mine.some((c) => OVERDUE.has(c.dunning.stage));
    const status = s.status as SubscriptionStatusValue;
    const end = day(s.currentPeriodEnd)!;
    return {
      id: s.id,
      tenantId: s.tenantId,
      tenantName: n.tenant.get(s.tenantId)?.name ?? "Negocio eliminado",
      tenantActive: n.tenant.get(s.tenantId)?.active ?? false,
      plan: s.plan,
      billingCycle: s.billingCycle as Cycle,
      priceUsdCents: s.priceUsdCents,
      status,
      displayStatus: status === "ACTIVE" && overdue ? "PAST_DUE" : status,
      periodStart: day(s.currentPeriodStart)!,
      periodEnd: end,
      nextChargeExists: mine.some((c) => c.periodStart === end),
      notes: s.notes,
    };
  });
}

export async function getSubscriptionByTenant(tenantId: string) {
  return (await listSubscriptions()).find((s) => s.tenantId === tenantId) ?? null;
}

/** Negocios activos sin suscripción (con el plan que eligieron al registrarse). */
export async function tenantsWithoutSubscription() {
  const [tenants, subs] = await Promise.all([
    db.orm.public.Tenant.select("id", "name", "plan", "billingCycle", "planMonthlyUsdCents", "accountStage").all(),
    db.orm.public.Subscription.select("tenantId").all(),
  ]);
  const has = new Set(subs.map((s) => s.tenantId));
  return tenants
    .filter((t) => !has.has(t.id) && t.accountStage !== "ARCHIVED" && t.accountStage !== "CANCELLED")
    .map((t) => ({ id: t.id, name: t.name, plan: t.plan, billingCycle: t.billingCycle as Cycle, monthlyCents: t.planMonthlyUsdCents }));
}

/** Crea la suscripción y su primer cobro (vence el día de inicio). */
export async function createSubscription(input: { tenantId: string; plan: string; cycle: Cycle; monthlyCents: number; startDate: string; trial: boolean; staffId: string }) {
  const end = periodEnd(input.startDate, input.cycle);
  return db.transaction(async (tx) => {
    const sub = await tx.orm.public.Subscription.create({
      tenantId: input.tenantId,
      plan: input.plan,
      billingCycle: input.cycle,
      priceUsdCents: input.monthlyCents,
      status: input.trial ? "TRIAL" : "ACTIVE",
      currentPeriodStart: at(input.startDate),
      currentPeriodEnd: at(end),
    });
    if (input.monthlyCents > 0 && !input.trial) {
      await tx.orm.public.Charge.create({
        tenantId: input.tenantId,
        subscriptionId: sub.id,
        periodStart: at(input.startDate),
        periodEnd: at(end),
        amountUsdCents: periodAmount(input.monthlyCents, input.cycle),
        dueAt: at(input.startDate),
        recordedById: input.staffId,
      });
    }
    return sub.id;
  });
}

export async function updateSubscription(id: string, fields: { priceUsdCents?: number; billingCycle?: Cycle; plan?: string; status?: SubscriptionStatusValue; notes?: string | null; cancelReason?: string | null }) {
  await db.orm.public.Subscription.where({ id }).update({ ...fields, ...(fields.status === "CANCELLED" ? { cancelledAt: now() } : {}) });
}

/** Cobro del siguiente período (si no existe). */
export async function generateRenewal(subscriptionId: string, staffId: string): Promise<string | null> {
  const s = await db.orm.public.Subscription.where({ id: subscriptionId }).first();
  if (!s || s.status === "CANCELLED") return null;
  const start = day(s.currentPeriodEnd)!;
  const exists = await db.orm.public.Charge.where({ subscriptionId, periodStart: at(start) }).select("id").first();
  if (exists) return null;
  const cycle = s.billingCycle as Cycle;
  const c = await db.orm.public.Charge.create({
    tenantId: s.tenantId,
    subscriptionId,
    periodStart: at(start),
    periodEnd: at(periodEnd(start, cycle)),
    amountUsdCents: periodAmount(s.priceUsdCents, cycle),
    dueAt: at(start),
    recordedById: staffId,
  });
  return c.id;
}

export async function addEvidence(chargeId: string, file: { name: string; type: string; bytes: Uint8Array }, staffId: string) {
  await db.orm.public.ChargeEvidence.create({
    chargeId,
    fileName: file.name.slice(0, 160),
    mimeType: file.type,
    byteSize: file.bytes.byteLength,
    sha256: createHash("sha256").update(file.bytes).digest("hex"),
    data: file.bytes,
    uploadedById: staffId,
  });
}

export async function recordPaymentDetails(chargeId: string, d: { method: string; reference: string | null; paidDate: string; notes: string | null }, staffId: string) {
  await db.orm.public.Charge.where({ id: chargeId }).update({ method: d.method, reference: d.reference, paidAt: at(d.paidDate), notes: d.notes, recordedById: staffId });
}

/**
 * Confirma el pago: el cobro queda pagado, la suscripción avanza al período
 * pagado y, si estaba suspendida solo por falta de pago y ya no debe nada,
 * se reactiva el servicio. Devuelve si reactivó.
 */
export async function confirmCharge(chargeId: string, staffId: string): Promise<{ reactivated: boolean }> {
  const c = await db.orm.public.Charge.where({ id: chargeId }).first();
  if (!c) return { reactivated: false };
  await db.orm.public.Charge.where({ id: chargeId }).update({ status: "PAID", confirmedById: staffId, confirmedAt: now() });
  const s = await db.orm.public.Subscription.where({ id: c.subscriptionId }).first();
  if (!s) return { reactivated: false };
  const patch: Record<string, unknown> = {};
  if (day(c.periodEnd)! > day(s.currentPeriodEnd)!) {
    patch.currentPeriodStart = c.periodStart;
    patch.currentPeriodEnd = c.periodEnd;
  }
  const policy = await getPolicy();
  const today = todayBogota();
  const pending = (await db.orm.public.Charge.where({ subscriptionId: s.id, status: "PENDING" }).select("dueAt", "noticeSentAt").all()).filter(
    (p) => OVERDUE.has(dunning({ status: "PENDING", dueDate: day(p.dueAt)!, noticeDate: day(p.noticeSentAt) }, policy, today).stage),
  );
  let reactivated = false;
  if (pending.length === 0 && (s.status === "SUSPENDED" || s.status === "PAST_DUE" || s.status === "TRIAL")) {
    patch.status = "ACTIVE";
    const t = await db.orm.public.Tenant.where({ id: s.tenantId }).select("active", "suspendedReason").first();
    if (s.status === "SUSPENDED" && t && !t.active && (t.suspendedReason ?? "").startsWith(NONPAYMENT_REASON)) {
      await createAdminDb().activateTenant(s.tenantId);
      reactivated = true;
    }
  }
  if (Object.keys(patch).length) await db.orm.public.Subscription.where({ id: s.id }).update(patch);
  return { reactivated };
}

export async function voidCharge(chargeId: string, reason: string) {
  await db.orm.public.Charge.where({ id: chargeId }).update({ status: "VOID", voidReason: reason });
}

export async function refundCharge(chargeId: string, reason: string) {
  await db.orm.public.Charge.where({ id: chargeId }).update({ status: "REFUNDED", refundReason: reason, refundedAt: now() });
}

export async function markNotice(chargeId: string) {
  await db.orm.public.Charge.where({ id: chargeId }).update({ noticeSentAt: now() });
}

/** Suspende el servicio por falta de pago (la acción valida la política). */
export async function suspendForNonPayment(c: ChargeRow) {
  await createAdminDb().suspendTenant(c.tenantId, `${NONPAYMENT_REASON}: cobro del ${c.periodStart} al ${c.periodEnd}`);
  await db.orm.public.Subscription.where({ id: c.subscriptionId }).update({ status: "SUSPENDED" });
}

export async function getEvidenceFile(id: string) {
  return db.orm.public.ChargeEvidence.where({ id }).select("fileName", "mimeType", "sha256", "data").first();
}

/** Indicadores del tablero de facturación. */
export function billingSummary(subs: SubscriptionRow[], charges: ChargeRow[], today: string) {
  const live = subs.filter((s) => s.status === "ACTIVE" || s.status === "PAST_DUE" || s.status === "SUSPENDED");
  const month = today.slice(0, 7);
  const sum = (list: ChargeRow[]) => list.reduce((t, c) => t + c.amountUsdCents, 0);
  const overdue = charges.filter((c) => OVERDUE.has(c.dunning.stage));
  return {
    mrrCents: live.filter((s) => s.status !== "SUSPENDED").reduce((t, s) => t + s.priceUsdCents, 0),
    collectedMonthCents: sum(charges.filter((c) => c.status === "PAID" && (c.confirmedDate ?? "").startsWith(month))),
    pendingCents: sum(charges.filter((c) => c.status === "PENDING" && !OVERDUE.has(c.dunning.stage))),
    overdueCents: sum(overdue),
    overdueCount: overdue.length,
    toConfirm: charges.filter((c) => c.status === "PENDING" && c.evidence.length > 0).length,
    suspendable: charges.filter((c) => c.dunning.stage === "suspend_eligible").length,
  };
}
