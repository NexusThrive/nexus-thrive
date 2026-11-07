import { MoneyError, moneyTransaction, recordFinanceFact } from "@/lib/business/sales/money-service";
import { toNumber } from "@/lib/foundation/format";
import { todayCO } from "@/lib/domains/finance/tax/tax";
import { db } from "@/prisma/db";
import { planSettlement, type ReportRow } from "./intents";

/**
 * Liquidaciones del proveedor de pagos (HU-liquidaciones-01): relaciona lo que la pasarela depositó con los cobros que NEXUS
 * confirmó, registra la comisión real y asienta la diferencia contra la estimada. Todo por `tenantId` y en una transacción.
 */
export type SettlementRow = { id: string; provider: string; externalRef: string; day: string; gross: number; feeEstimated: number; feeReal: number; netReceived: number; difference: number; itemCount: number; accounted: boolean; createdAt: string };

const dec = (n: number) => n.toFixed(2);

/** Registra una liquidación completa o ninguna. Una referencia ya registrada se rechaza (no se liquida dos veces). */
export async function registerSettlement(
  tenantId: string,
  input: { provider: string; externalRef: string; day: string; rows: readonly ReportRow[]; feeReal: number; netReceived: number },
  userId: string,
): Promise<{ ok: true; id: string; difference: number } | { ok: false; message: string; missing?: string[] }> {
  const externalRef = input.externalRef.trim().slice(0, 120);
  if (externalRef.length < 3) return { ok: false, message: "Escribe la referencia de la liquidación." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) return { ok: false, message: "Elige la fecha del depósito." };
  try {
    return await moneyTransaction(async (tx) => {
      if (await tx.orm.public.ProviderSettlement.where({ tenantId, provider: input.provider, externalRef }).select("id").first()) throw new MoneyError("Esa liquidación ya está registrada.");
      const paid = await tx.orm.public.PaymentIntent.where({ tenantId, provider: input.provider, status: "PAID", confirmedBy: "PROVIDER" }).all();
      const open = paid.filter((p) => !p.settlementId && p.providerRefId).map((p) => ({ id: p.id, providerRefId: p.providerRefId!, amount: toNumber(p.amount), feeEstimated: p.feeEstimated == null ? null : toNumber(p.feeEstimated) }));
      const plan = planSettlement(open, input.rows, input.feeReal, input.netReceived);
      if (!plan.ok) return plan;
      const settlement = await tx.orm.public.ProviderSettlement.create({ tenantId, provider: input.provider, externalRef, day: input.day, gross: dec(plan.gross), feeEstimated: dec(plan.feeEstimated), feeReal: dec(plan.feeReal), netReceived: dec(plan.netReceived), difference: dec(plan.difference), itemCount: plan.ids.length, createdById: userId });
      for (const id of plan.ids) await tx.orm.public.PaymentIntent.where({ tenantId, id }).update({ settlementId: settlement.id });
      // Asiento: entra el depósito, sale lo «por cobrar a la pasarela» (bruto − comisión estimada) y la diferencia de comisión es gasto o menor gasto.
      const diff = Math.abs(plan.difference);
      const posted = await recordFinanceFact(tx, tenantId, { event: plan.difference >= 0 ? "SETTLEMENT" : "SETTLEMENT_REFUND", amounts: { net: plan.netReceived, fee: diff, payment: Math.round((plan.gross - plan.feeEstimated) * 100) / 100 }, date: todayCO(), description: `Liquidación ${externalRef}`, sourceType: "SETTLEMENT", sourceId: settlement.id }, userId);
      if (posted) await tx.orm.public.ProviderSettlement.where({ tenantId, id: settlement.id }).update({ accounted: true });
      return { ok: true as const, id: settlement.id, difference: plan.difference };
    });
  } catch (e) {
    if (e instanceof MoneyError) return { ok: false, message: e.message };
    throw e;
  }
}

/** Liquidaciones del negocio, la más reciente primero. */
export async function listSettlements(tenantId: string, limit = 30): Promise<SettlementRow[]> {
  const rows = await db.orm.public.ProviderSettlement.where({ tenantId }).orderBy((s) => s.createdAt.desc()).limit(limit).all();
  return rows.map((s) => ({ id: s.id, provider: s.provider, externalRef: s.externalRef, day: s.day, gross: toNumber(s.gross), feeEstimated: toNumber(s.feeEstimated), feeReal: toNumber(s.feeReal), netReceived: toNumber(s.netReceived), difference: toNumber(s.difference), itemCount: s.itemCount, accounted: s.accounted, createdAt: String(s.createdAt) }));
}

/** Cobros que quedaron ligados a una liquidación. */
export async function settlementItems(tenantId: string, settlementId: string) {
  const rows = await db.orm.public.PaymentIntent.where({ tenantId, settlementId }).all();
  return rows.map((p) => ({ id: p.id, reference: p.reference, description: p.description, amount: toNumber(p.amount), providerRefId: p.providerRefId }));
}
