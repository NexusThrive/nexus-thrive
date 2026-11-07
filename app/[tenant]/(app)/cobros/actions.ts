"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/core/auth/permissions";
import { cancelIntent, confirmIntent, createIntent, refundIntent, rejectProof, runReconciliation, type IntentRow } from "@/lib/domains/finance/payments/intents-db";
import { parseReport } from "@/lib/domains/finance/payments/intents";
import { registerSettlement } from "@/lib/domains/finance/payments/settlements-db";
import { confirmMatch, importStatement, markReviewed } from "@/lib/domains/finance/payments/statements-db";
import type { Reconciliation } from "@/lib/domains/finance/payments/intents";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type CobroResult = { ok: true; message: string } | { ok: false; message: string };
const refresh = (slug: string) => revalidatePath(`/${slug}/cobros`);

async function ctxFor(slug: string, perm: "money.handle" | "business.manage") {
  const ctx = await requireTenantContext(slug, "/cobros");
  return ctx && can(ctx.role, perm) ? ctx : null;
}

export async function createIntentAction(slug: string, input: { amount: number; description: string; expiresInHours: number; provider?: string }): Promise<CobroResult> {
  const ctx = await ctxFor(slug, "money.handle");
  if (!ctx) return { ok: false, message: "Tu rol no crea cobros." };
  const r = await createIntent(ctx.tenantId, input, ctx.memberId);
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

/** Rechaza el comprobante de una transferencia en verificación: el cobro vuelve a pendiente con el motivo. */
export async function rejectProofAction(slug: string, id: string, reason: string): Promise<CobroResult> {
  const ctx = await ctxFor(slug, "business.manage");
  if (!ctx) return { ok: false, message: "Solo el dueño o administración verifica pagos." };
  const r = await rejectProof(ctx.tenantId, id, reason);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "reject_proof", id });
  refresh(slug);
  return { ok: true, message: "Comprobante rechazado: el cobro vuelve a pendiente" };
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

/** Registra la liquidación que depositó la pasarela: pega sus transacciones («id, valor»), la comisión real y lo depositado. */
export async function registerSettlementAction(slug: string, input: { externalRef: string; day: string; report: string; feeReal: number; netReceived: number }): Promise<CobroResult> {
  const ctx = await ctxFor(slug, "business.manage");
  if (!ctx) return { ok: false, message: "Solo el dueño o administración registra liquidaciones." };
  const parsed = parseReport(input.report);
  if (parsed.bad.length) return { ok: false, message: `Revisa las líneas ${parsed.bad.join(", ")}: cada una es «id, valor».` };
  const r = await registerSettlement(ctx.tenantId, { provider: "wompi", externalRef: input.externalRef, day: input.day, rows: parsed.rows, feeReal: input.feeReal, netReceived: input.netReceived }, ctx.memberId);
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "settlement", externalRef: input.externalRef, difference: r.difference });
  refresh(slug);
  return { ok: true, message: r.difference === 0 ? "Liquidación registrada: la comisión real coincide con la estimada" : r.difference > 0 ? `Liquidación registrada: la comisión real fue ${Math.abs(r.difference).toLocaleString("es-CO")} mayor que la estimada` : `Liquidación registrada: la comisión real fue ${Math.abs(r.difference).toLocaleString("es-CO")} menor que la estimada` };
}

/** Importa el extracto del banco («fecha; descripción; referencia; valor» por línea) y propone el cruce de cada depósito. */
export async function importStatementAction(slug: string, text: string): Promise<CobroResult> {
  const ctx = await ctxFor(slug, "business.manage");
  if (!ctx) return { ok: false, message: "Solo el dueño o administración concilia." };
  const r = await importStatement(ctx.tenantId, text);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "import_statement", added: r.added });
  refresh(slug);
  const extra = [r.duplicates ? `${r.duplicates} ya estaban` : "", r.bad.length ? `${r.bad.length} líneas no se leyeron` : ""].filter(Boolean).join(" · ");
  return { ok: true, message: `${r.added} movimientos importados, ${r.proposed} con propuesta${extra ? ` (${extra})` : ""}` };
}

/** Confirma el cruce propuesto de un movimiento del extracto. Nada se concilia solo. */
export async function confirmMatchAction(slug: string, lineId: string): Promise<CobroResult> {
  const ctx = await ctxFor(slug, "business.manage");
  if (!ctx) return { ok: false, message: "Solo el dueño o administración concilia." };
  const r = await confirmMatch(ctx.tenantId, lineId, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_ONLINE_PAYMENT", { action: "confirm_match", lineId });
  refresh(slug);
  return { ok: true, message: "Movimiento conciliado" };
}

/** Marca un movimiento como revisado sin cruce: sale de las propuestas. */
export async function reviewLineAction(slug: string, lineId: string): Promise<CobroResult> {
  const ctx = await ctxFor(slug, "business.manage");
  if (!ctx) return { ok: false, message: "Solo el dueño o administración concilia." };
  const r = await markReviewed(ctx.tenantId, lineId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Marcado como revisado: no se vuelve a proponer" };
}

export type { IntentRow };
