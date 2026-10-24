import { toNumber } from "@/lib/format";
import { db } from "@/prisma/db";
import { auxiliaryByParty, balanceSheet, generalLedger, incomeStatement, journal, journalCsv, statementCsv, trialBalance, trialBalanceCsv, type LedgerRow } from "./reports";
import type { AccountType } from "./puc";

/** Informes contables (servidor): lee el libro del negocio en un rango de fechas y arma cada informe. Todo por `tenantId`. */
export const REPORTS = ["trial", "income", "balance", "journal", "ledger", "auxiliary"] as const;
export type ReportKind = (typeof REPORTS)[number];
export const REPORT_LABELS: Record<ReportKind, string> = { trial: "Balance de prueba", income: "Estado de resultados", balance: "Balance general", journal: "Libro diario", ledger: "Libro mayor", auxiliary: "Auxiliar por tercero" };

/** Líneas del libro entre dos fechas (AAAA-MM-DD, inclusive), con nombres de cuenta, tercero y centro de costo. */
export async function ledgerRows(tenantId: string, from: string, to: string): Promise<LedgerRow[]> {
  const entries = await db.orm.public.JournalEntry.where({ tenantId }).where((e) => e.date.gte(from)).where((e) => e.date.lte(to)).orderBy((e) => e.number.asc()).all();
  if (!entries.length) return [];
  const [lines, accounts] = await Promise.all([
    db.orm.public.JournalLine.where({ tenantId }).where((l) => l.entryId.in(entries.map((e) => e.id))).all(),
    db.orm.public.Account.where({ tenantId }).all(),
  ]);
  const partyIds = [...new Set(lines.map((l) => l.partyId).filter((x): x is string => Boolean(x)))];
  const centerIds = [...new Set(lines.map((l) => l.costCenterId).filter((x): x is string => Boolean(x)))];
  const [parties, centers] = await Promise.all([
    partyIds.length ? db.orm.public.Party.where({ tenantId }).where((p) => p.id.in(partyIds)).select("id", "legalName", "documentNumber").all() : Promise.resolve([]),
    centerIds.length ? db.orm.public.CostCenter.where({ tenantId }).where((c) => c.id.in(centerIds)).select("id", "name").all() : Promise.resolve([]),
  ]);
  const acc = new Map(accounts.map((a) => [a.code, a]));
  const party = new Map(parties.map((p) => [p.id, p]));
  const center = new Map(centers.map((c) => [c.id, c.name]));
  const entry = new Map(entries.map((e) => [e.id, e]));
  return lines.map((l) => {
    const e = entry.get(l.entryId)!;
    const a = acc.get(l.accountCode);
    const p = l.partyId ? party.get(l.partyId) : null;
    return { date: e.date, entryNumber: e.number, description: e.description, event: e.event, account: l.accountCode, accountName: a?.name ?? l.accountCode, type: (a?.type ?? "ASSET") as AccountType, debit: toNumber(l.debit), credit: toNumber(l.credit), partyName: p?.legalName ?? null, partyDoc: p?.documentNumber ?? null, costCenter: l.costCenterId ? (center.get(l.costCenterId) ?? null) : null };
  }).sort((x, y) => x.entryNumber - y.entryNumber);
}

export type ReportResult =
  | { kind: "trial"; data: ReturnType<typeof trialBalance> }
  | { kind: "income"; data: ReturnType<typeof incomeStatement> }
  | { kind: "balance"; data: ReturnType<typeof balanceSheet> }
  | { kind: "journal"; data: ReturnType<typeof journal> }
  | { kind: "ledger"; account: string; data: ReturnType<typeof generalLedger> }
  | { kind: "auxiliary"; account: string; data: ReturnType<typeof auxiliaryByParty> };

export function buildReport(kind: ReportKind, rows: readonly LedgerRow[], account: string): ReportResult {
  switch (kind) {
    case "trial": return { kind, data: trialBalance(rows) };
    case "income": return { kind, data: incomeStatement(rows) };
    case "balance": return { kind, data: balanceSheet(rows) };
    case "journal": return { kind, data: journal(rows) };
    case "ledger": return { kind, account, data: generalLedger(rows, account) };
    case "auxiliary": return { kind, account, data: auxiliaryByParty(rows, account) };
  }
}

/** Archivo CSV de un informe para llevarle al contador. */
export function reportCsv(kind: ReportKind, rows: readonly LedgerRow[], account: string): string {
  const r = buildReport(kind, rows, account);
  if (r.kind === "trial") return trialBalanceCsv(r.data);
  if (r.kind === "income") return statementCsv("Estado de resultados", [{ name: "Ingresos", items: r.data.income, total: r.data.totalIncome }, { name: "Costos", items: r.data.cost, total: r.data.totalCost }, { name: "Gastos", items: r.data.expenses, total: r.data.totalExpenses }], [["Utilidad bruta", r.data.grossProfit], ["Resultado del período", r.data.netResult]]);
  if (r.kind === "balance") return statementCsv("Balance general", [{ name: "Activo", items: r.data.assets, total: r.data.totalAssets }, { name: "Pasivo", items: r.data.liabilities, total: r.data.totalLiabilities }, { name: "Patrimonio", items: r.data.equity, total: r.data.totalEquity - r.data.netResult }], [["Resultado del ejercicio", r.data.netResult], ["Total patrimonio", r.data.totalEquity]]);
  return journalCsv(kind === "ledger" || kind === "auxiliary" ? rows.filter((x) => x.account === account) : rows);
}

/** Rango por omisión: el mes en curso. */
export const monthRange = (today: string) => ({ from: `${today.slice(0, 8)}01`, to: today });
