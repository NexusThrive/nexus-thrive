import { toNumber } from "@/lib/foundation/format";
import { receivables } from "@/lib/domains/finance/receivables/receivables-db";
import { todayCO } from "@/lib/domains/finance/tax/tax";
import { db } from "@/prisma/db";

/**
 * «¿Dónde está mi dinero?» (HU-vista-financiera-01): una sola vista del dinero del negocio. Solo LEE de los motores
 * (cobros, cartera, liquidaciones, extracto); no calcula reglas propias ni escribe. Todo por `tenantId`.
 */
export type ChannelRow = { channel: string; label: string; received: number; count: number };
export type MoneyOverview = {
  days: number;
  /** Cobrado en el periodo (pagos aprobados), por canal. */
  received: number;
  byChannel: ChannelRow[];
  /** Lo que te deben hoy (cartera) y cuántas deudas son. */
  receivable: { total: number; count: number; overdue: number };
  /** Comisiones de la pasarela en el periodo: estimadas al cobrar y reales al liquidar. */
  fees: { estimated: number; real: number };
  /** Pagos de la pasarela ya confirmados que aún no llegan a tu banco (neto esperado). */
  inGateway: { net: number; count: number };
  /** Transferencias que el cliente avisó y falta verificar. */
  toVerify: { count: number; amount: number };
  /** Movimientos del banco por conciliar: propuestos (falta confirmar) y pendientes. */
  toReconcile: { proposed: number; pending: number };
};

const CHANNEL_LABEL: Record<string, string> = { CASH: "Efectivo", TRANSFER: "Transferencia", WOMPI: "Wompi (tarjeta, PSE)", NEQUI: "Nequi" };
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Resumen del dinero de los últimos `days` días (30 por defecto). */
export async function moneyOverview(tenantId: string, days = 30): Promise<MoneyOverview> {
  const sinceMs = Date.now() - days * 86_400_000;
  const since = Temporal.Instant.fromEpochMilliseconds(sinceMs);
  const [payments, cartera, intents, settlements, lines] = await Promise.all([
    db.orm.public.Payment.where({ tenantId, status: "APPROVED" }).where((p) => p.createdAt.gte(since)).select("provider", "amount").limit(5000).all(),
    receivables(tenantId),
    db.orm.public.PaymentIntent.where({ tenantId }).where((i) => i.status.in(["PAID", "VERIFYING"])).select("status", "amount", "confirmedBy", "paidAt", "feeEstimated", "netExpected", "settlementId").limit(5000).all(),
    db.orm.public.ProviderSettlement.where({ tenantId }).where((s) => s.createdAt.gte(since)).select("feeReal").all(),
    db.orm.public.BankStatementLine.where({ tenantId }).where((l) => l.status.in(["PROPOSED", "UNMATCHED"])).select("status").limit(5000).all(),
  ]);

  const channels = new Map<string, ChannelRow>();
  for (const p of payments) {
    const key = String(p.provider);
    const row = channels.get(key) ?? { channel: key, label: CHANNEL_LABEL[key] ?? key, received: 0, count: 0 };
    row.received = round2(row.received + toNumber(p.amount));
    row.count += 1;
    channels.set(key, row);
  }
  const byChannel = [...channels.values()].sort((a, b) => b.received - a.received);
  const paidInPeriod = intents.filter((i) => i.status === "PAID" && i.paidAt && new Date(String(i.paidAt)).getTime() >= sinceMs);
  const gatewayOpen = intents.filter((i) => i.status === "PAID" && i.confirmedBy === "PROVIDER" && !i.settlementId && i.netExpected != null);
  const verifying = intents.filter((i) => i.status === "VERIFYING");
  const today = todayCO();

  return {
    days,
    received: round2(byChannel.reduce((s, c) => s + c.received, 0)),
    byChannel,
    receivable: { total: round2(cartera.rows.reduce((s, r) => s + r.balance, 0)), count: cartera.rows.length, overdue: cartera.rows.filter((r) => r.dueDate !== null && r.dueDate < today).length },
    fees: { estimated: round2(paidInPeriod.reduce((s, i) => s + (i.feeEstimated == null ? 0 : toNumber(i.feeEstimated)), 0)), real: round2(settlements.reduce((s, x) => s + toNumber(x.feeReal), 0)) },
    inGateway: { net: round2(gatewayOpen.reduce((s, i) => s + toNumber(i.netExpected as never), 0)), count: gatewayOpen.length },
    toVerify: { count: verifying.length, amount: round2(verifying.reduce((s, i) => s + toNumber(i.amount), 0)) },
    toReconcile: { proposed: lines.filter((l) => l.status === "PROPOSED").length, pending: lines.filter((l) => l.status === "UNMATCHED").length },
  };
}
