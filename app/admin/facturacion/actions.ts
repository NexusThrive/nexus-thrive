"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/ops/access";
import { logOps } from "@/lib/ops/audit";
import {
  addEvidence,
  confirmCharge,
  createSubscription,
  generateRenewal,
  getCharge,
  markNotice,
  recordPaymentDetails,
  refundCharge,
  savePolicy,
  suspendForNonPayment,
  updateSubscription,
  voidCharge,
} from "@/lib/ops/billing";
import { checkConfirm, checkEvidence, PAYMENT_METHODS, validatePolicy, type BillingPolicyValues, type Cycle, type SubscriptionStatusValue } from "@/lib/ops/billing-rules";
import { db } from "@/prisma/db";

export type BillingResult = { ok: true; message?: string } | { ok: false; message: string };
const DENIED = { ok: false as const, message: "No tienes permiso para esta acción." };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh(tenantId?: string) {
  revalidatePath("/admin/facturacion");
  revalidatePath("/admin");
  if (tenantId) revalidatePath(`/admin/negocios/${tenantId}`);
}

export async function createSubscriptionAction(input: { tenantId: string; plan: string; cycle: string; monthlyCents: number; startDate: string; trial: boolean }): Promise<BillingResult> {
  const ctx = await requireStaff("billing.record");
  if (!ctx) return DENIED;
  const t = await db.orm.public.Tenant.where({ id: input.tenantId }).select("name").first();
  if (!t) return { ok: false, message: "El negocio no existe." };
  if (await db.orm.public.Subscription.where({ tenantId: input.tenantId }).select("id").first()) return { ok: false, message: "Este negocio ya tiene suscripción." };
  if (!["ESSENTIAL", "ELITE", "SIGNATURE"].includes(input.plan)) return { ok: false, message: "Plan no válido." };
  const cycle: Cycle = input.cycle === "ANNUAL" ? "ANNUAL" : "MONTHLY";
  const cents = Math.round(input.monthlyCents);
  if (!Number.isFinite(cents) || cents < 0 || cents > 10_000_00) return { ok: false, message: "Precio no válido." };
  if (!DATE.test(input.startDate)) return { ok: false, message: "Fecha de inicio no válida." };
  await createSubscription({ tenantId: input.tenantId, plan: input.plan, cycle, monthlyCents: cents, startDate: input.startDate, trial: !!input.trial, staffId: ctx.staffId });
  await logOps(ctx, "SUBSCRIPTION_SAVE", { targetTenantId: input.tenantId, targetTenantName: t.name, metadata: { created: true, plan: input.plan, cycle, monthlyCents: cents, startDate: input.startDate, trial: input.trial } });
  refresh(input.tenantId);
  return { ok: true, message: "Suscripción creada" };
}

export async function updateSubscriptionAction(id: string, input: { priceUsdCents: number; billingCycle: string; status: string; notes: string; cancelReason?: string }): Promise<BillingResult> {
  const ctx = await requireStaff("billing.record");
  if (!ctx) return DENIED;
  const s = await db.orm.public.Subscription.where({ id }).first();
  if (!s) return { ok: false, message: "La suscripción no existe." };
  const status = (["TRIAL", "ACTIVE", "CANCELLED"] as SubscriptionStatusValue[]).includes(input.status as SubscriptionStatusValue) ? (input.status as SubscriptionStatusValue) : (s.status as SubscriptionStatusValue);
  if (status === "CANCELLED" && !input.cancelReason?.trim()) return { ok: false, message: "Indica el motivo de la cancelación." };
  const price = Math.round(input.priceUsdCents);
  if (!Number.isFinite(price) || price < 0) return { ok: false, message: "Precio no válido." };
  if (price !== s.priceUsdCents && !ctx.permissions.includes("pricing.edit")) return { ok: false, message: "Cambiar el precio requiere el permiso de precios." };
  await updateSubscription(id, { priceUsdCents: price, billingCycle: input.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY", status, notes: input.notes.trim() || null, cancelReason: status === "CANCELLED" ? input.cancelReason!.trim() : null });
  await logOps(ctx, "SUBSCRIPTION_SAVE", { targetTenantId: s.tenantId, metadata: { subscriptionId: id, before: { price: s.priceUsdCents, cycle: s.billingCycle, status: s.status }, after: { price, cycle: input.billingCycle, status } } });
  refresh(s.tenantId);
  return { ok: true, message: "Suscripción actualizada" };
}

export async function generateRenewalAction(subscriptionId: string): Promise<BillingResult> {
  const ctx = await requireStaff("billing.record");
  if (!ctx) return DENIED;
  const id = await generateRenewal(subscriptionId, ctx.staffId);
  if (!id) return { ok: false, message: "El cobro del siguiente período ya existe o la suscripción está cancelada." };
  const c = await getCharge(id);
  await logOps(ctx, "CHARGE_RECORD", { targetTenantId: c?.tenantId, targetTenantName: c?.tenantName, metadata: { chargeId: id, renewal: true, period: `${c?.periodStart}..${c?.periodEnd}` } });
  refresh(c?.tenantId);
  return { ok: true, message: "Cobro de renovación generado" };
}

/** Registra el pago con su comprobante (FormData: chargeId, method, reference, paidDate, notes, files[]). */
export async function recordPaymentAction(form: FormData): Promise<BillingResult> {
  const ctx = await requireStaff("billing.record");
  if (!ctx) return DENIED;
  const c = await getCharge(String(form.get("chargeId") ?? ""));
  if (!c) return { ok: false, message: "El cobro no existe." };
  if (c.status !== "PENDING") return { ok: false, message: "Solo se registran pagos de cobros pendientes." };
  const method = String(form.get("method") ?? "");
  const paidDate = String(form.get("paidDate") ?? "");
  if (!(PAYMENT_METHODS as readonly string[]).includes(method)) return { ok: false, message: "Elige el método de pago." };
  if (!DATE.test(paidDate)) return { ok: false, message: "Indica la fecha del pago." };
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length + c.evidence.length === 0) return { ok: false, message: "Adjunta el comprobante del pago." };
  for (const f of files) {
    const err = checkEvidence(f);
    if (err) return { ok: false, message: `${f.name}: ${err}` };
  }
  for (const f of files) await addEvidence(c.id, { name: f.name, type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) }, ctx.staffId);
  const reference = String(form.get("reference") ?? "").trim().slice(0, 120) || null;
  const notes = String(form.get("notes") ?? "").trim().slice(0, 1000) || null;
  await recordPaymentDetails(c.id, { method, reference, paidDate, notes }, ctx.staffId);
  await logOps(ctx, "CHARGE_RECORD", { targetTenantId: c.tenantId, targetTenantName: c.tenantName, metadata: { chargeId: c.id, method, reference, paidDate, files: files.map((f) => f.name) } });
  refresh(c.tenantId);
  return { ok: true, message: "Pago registrado: falta confirmarlo" };
}

export async function confirmChargeAction(chargeId: string): Promise<BillingResult> {
  const ctx = await requireStaff("billing.record");
  if (!ctx) return DENIED;
  const c = await getCharge(chargeId);
  if (!c) return { ok: false, message: "El cobro no existe." };
  const check = checkConfirm({ status: c.status, evidenceCount: c.evidence.length, method: c.method, paidDate: c.paidDate });
  if (!check.ok) return { ok: false, message: check.message };
  const r = await confirmCharge(chargeId, ctx.staffId);
  await logOps(ctx, "CHARGE_CONFIRM", { targetTenantId: c.tenantId, targetTenantName: c.tenantName, metadata: { chargeId, amount: c.amountUsdCents, reactivated: r.reactivated } });
  if (r.reactivated) await logOps(ctx, "ACTIVATE_TENANT", { targetTenantId: c.tenantId, targetTenantName: c.tenantName, metadata: { reason: "Pago confirmado" } });
  refresh(c.tenantId);
  return { ok: true, message: r.reactivated ? "Pago confirmado · servicio reactivado" : "Pago confirmado" };
}

export async function voidChargeAction(chargeId: string, reason: string): Promise<BillingResult> {
  const ctx = await requireStaff("billing.record");
  if (!ctx) return DENIED;
  const c = await getCharge(chargeId);
  if (!c || c.status !== "PENDING") return { ok: false, message: "Solo se anulan cobros pendientes." };
  if (reason.trim().length < 3) return { ok: false, message: "Indica el motivo de la anulación." };
  await voidCharge(chargeId, reason.trim().slice(0, 300));
  await logOps(ctx, "CHARGE_RECORD", { targetTenantId: c.tenantId, targetTenantName: c.tenantName, metadata: { chargeId, void: true, reason } });
  refresh(c.tenantId);
  return { ok: true, message: "Cobro anulado" };
}

export async function refundChargeAction(chargeId: string, reason: string): Promise<BillingResult> {
  const ctx = await requireStaff("billing.refund");
  if (!ctx) return DENIED;
  const c = await getCharge(chargeId);
  if (!c || c.status !== "PAID") return { ok: false, message: "Solo se reembolsan cobros pagados." };
  if (reason.trim().length < 3) return { ok: false, message: "Indica el motivo del reembolso." };
  await refundCharge(chargeId, reason.trim().slice(0, 300));
  await logOps(ctx, "CHARGE_REFUND", { targetTenantId: c.tenantId, targetTenantName: c.tenantName, metadata: { chargeId, amount: c.amountUsdCents, reason } });
  refresh(c.tenantId);
  return { ok: true, message: "Reembolso registrado" };
}

/** Registra que se envió el aviso de suspensión (inicia el plazo del aviso). */
export async function markNoticeAction(chargeId: string): Promise<BillingResult> {
  const ctx = await requireStaff("billing.record");
  if (!ctx) return DENIED;
  const c = await getCharge(chargeId);
  if (!c || c.dunning.stage !== "notice_needed") return { ok: false, message: "Este cobro no necesita aviso ahora." };
  await markNotice(chargeId);
  await logOps(ctx, "CHARGE_RECORD", { targetTenantId: c.tenantId, targetTenantName: c.tenantName, metadata: { chargeId, notice: true } });
  refresh(c.tenantId);
  return { ok: true, message: "Aviso de suspensión registrado" };
}

/** Suspende por falta de pago, solo si la política lo permite. */
export async function suspendForNonPaymentAction(chargeId: string): Promise<BillingResult> {
  const ctx = await requireStaff("accounts.suspend");
  if (!ctx) return DENIED;
  const c = await getCharge(chargeId);
  if (!c) return { ok: false, message: "El cobro no existe." };
  if (c.dunning.stage !== "suspend_eligible") return { ok: false, message: "La política aún no permite suspender: hace falta el aviso y que pase su plazo." };
  if (!c.tenantActive) return { ok: false, message: "El servicio ya está suspendido." };
  await suspendForNonPayment(c);
  await logOps(ctx, "SUSPEND_TENANT", { targetTenantId: c.tenantId, targetTenantName: c.tenantName, metadata: { reason: "Falta de pago", chargeId } });
  refresh(c.tenantId);
  return { ok: true, message: "Servicio suspendido por falta de pago" };
}

export async function savePolicyAction(input: BillingPolicyValues): Promise<BillingResult> {
  const ctx = await requireStaff("pricing.edit");
  if (!ctx) return DENIED;
  const v = validatePolicy(input);
  if (!v.ok) return { ok: false, message: v.message };
  await savePolicy(v.value);
  await logOps(ctx, "CATALOG_UPDATE", { metadata: { kind: "billing-policy", after: v.value } });
  refresh();
  return { ok: true, message: "Política guardada" };
}
