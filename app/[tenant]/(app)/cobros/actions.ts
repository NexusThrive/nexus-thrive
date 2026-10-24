"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/business/permissions";
import { cancelIntent, connectedGateways, confirmIntent, createIntent, refundIntent, runReconciliation, type IntentRow } from "@/lib/payments/intents-db";
import { parseReport } from "@/lib/payments/intents";
import type { Reconciliation } from "@/lib/payments/intents";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type CobroResult = { ok: true; message: string } | { ok: false; message: string };
const refresh = (slug: string) => revalidatePath(`/${slug}/cobros`);

async function ctxFor(slug: string, perm: "money.handle" | "business.manage") {
  const ctx = await requireTenantContext(slug, "/cobros");
  return ctx && can(ctx.role, perm) ? ctx : null;
}

export async function createIntentAction(slug: string, input: { amount: number; description: string; expiresInHours: number; provider?: string }): Promise<CobroResult> {
  const ctx = await ctxFor(slug, "money.handle");
  if (!ctx) return { ok: false, message: "Tu rol no crea cobros." };
  const gateways = await connectedGateways(ctx.tenantId);
  const provider = gateways.some((g) => g.value === input.provider) ? input.provider : (gateways[0]?.value ?? "sandbox");
  const r = await createIntent(ctx.tenantId, { ...input, provider }, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "create", amount: input.amount });
  refresh(slug);
  return { ok: true, message: "Enlace de cobro creado" };
}

export async function cancelIntentAction(slug: string, id: string): Promise<CobroResult> {
  const ctx = await ctxFor(slug, "money.handle");
  if (!ctx) return { ok: false, message: "Tu rol no cancela cobros." };
  if (!(await cancelIntent(ctx.tenantId, id))) return { ok: false, message: "Solo se cancelan los cobros pendientes." };
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "cancel", id });
  refresh(slug);
  return { ok: true, message: "Cobro cancelado" };
}

/** Confirmación manual (transferencia): el dinero entra solo con evidencia escrita y de quien administra. */
export async function confirmManualAction(slug: string, reference: string, evidence: string): Promise<CobroResult> {
  const ctx = await ctxFor(slug, "business.manage");
  if (!ctx) return { ok: false, message: "Solo el dueño o administración confirma pagos a mano." };
  const r = await confirmIntent(ctx.tenantId, reference, { kind: "MANUAL", evidence, userId: ctx.memberId });
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "confirm_manual", reference });
  refresh(slug);
  return { ok: true, message: r.already ? "Ese cobro ya estaba pagado" : "Pago confirmado" };
}

export async function refundAction(slug: string, id: string, amount: number, reason: string): Promise<CobroResult> {
  const ctx = await ctxFor(slug, "business.manage");
  if (!ctx) return { ok: false, message: "Solo el dueño o administración reembolsa." };
  const r = await refundIntent(ctx.tenantId, id, amount, reason, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "refund", id, amount });
  refresh(slug);
  return { ok: true, message: r.remaining === 0 ? "Reembolso total registrado" : `Reembolso registrado. Quedan ${r.remaining.toLocaleString("es-CO")} cobrados` };
}

export async function reconcileAction(slug: string, day: string, report: string, provider = "sandbox"): Promise<{ ok: true; result: Reconciliation; bad: number[] } | { ok: false; message: string }> {
  const ctx = await ctxFor(slug, "business.manage");
  if (!ctx) return { ok: false, message: "Solo el dueño o administración concilia." };
  const parsed = parseReport(report);
  if (!parsed.rows.length) return { ok: false, message: "Pega el reporte del proveedor: un cobro por línea («id, valor»)." };
  const r = await runReconciliation(ctx.tenantId, provider === "wompi" ? "wompi" : "sandbox", day, parsed.rows, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "reconcile", day, differences: r.result.differences.length });
  refresh(slug);
  return { ok: true, result: r.result, bad: parsed.bad };
}

export type { IntentRow };
