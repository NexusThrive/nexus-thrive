import { toCsv } from "@/lib/data-exchange/table";
import { cents, fromCents } from "./ledger";
import type { AccountType } from "./puc";

/**
 * Informes contables (reglas puras): balance de prueba, estado de resultados, balance general, libro diario,
 * libro mayor y auxiliar por tercero, y los archivos CSV para el contador. Todo en centavos enteros.
 */
export type LedgerRow = {
  date: string;
  entryNumber: number;
  description: string;
  event: string;
  account: string;
  accountName: string;
  type: AccountType;
  debit: number;
  credit: number;
  partyName?: string | null;
  partyDoc?: string | null;
  costCenter?: string | null;
};

const sum = (xs: readonly number[]) => fromCents(xs.reduce((s, x) => s + cents(x), 0));

export type TrialRow = { account: string; name: string; type: AccountType; debit: number; credit: number; balanceDebit: number; balanceCredit: number };
export type TrialBalance = { rows: TrialRow[]; totalDebit: number; totalCredit: number; totalBalanceDebit: number; totalBalanceCredit: number; balanced: boolean };

/** Balance de prueba: por cuenta, lo debitado, lo acreditado y su saldo; los totales deben ser iguales. */
export function trialBalance(rows: readonly LedgerRow[]): TrialBalance {
  const by = new Map<string, { name: string; type: AccountType; d: number; c: number }>();
  for (const r of rows) {
    const e = by.get(r.account) ?? { name: r.accountName, type: r.type, d: 0, c: 0 };
    e.d += cents(r.debit);
    e.c += cents(r.credit);
    by.set(r.account, e);
  }
  const out: TrialRow[] = [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([account, e]) => {
    const net = e.d - e.c;
    return { account, name: e.name, type: e.type, debit: fromCents(e.d), credit: fromCents(e.c), balanceDebit: net > 0 ? fromCents(net) : 0, balanceCredit: net < 0 ? fromCents(-net) : 0 };
  });
  const t = { totalDebit: sum(out.map((r) => r.debit)), totalCredit: sum(out.map((r) => r.credit)), totalBalanceDebit: sum(out.map((r) => r.balanceDebit)), totalBalanceCredit: sum(out.map((r) => r.balanceCredit)) };
  return { rows: out, ...t, balanced: cents(t.totalDebit) === cents(t.totalCredit) && cents(t.totalBalanceDebit) === cents(t.totalBalanceCredit) };
}

export type Section = { account: string; name: string; amount: number }[];
const natural = (r: TrialRow) => (r.type === "ASSET" || r.type === "EXPENSE" || r.type === "COST" ? fromCents(cents(r.balanceDebit) - cents(r.balanceCredit)) : fromCents(cents(r.balanceCredit) - cents(r.balanceDebit)));

export type IncomeStatement = { income: Section; cost: Section; expenses: Section; totalIncome: number; totalCost: number; grossProfit: number; totalExpenses: number; netResult: number };

/** Estado de resultados: ingresos − costos = utilidad bruta; − gastos = resultado del período. */
export function incomeStatement(rows: readonly LedgerRow[]): IncomeStatement {
  const tb = trialBalance(rows).rows;
  const pick = (t: AccountType): Section => tb.filter((r) => r.type === t).map((r) => ({ account: r.account, name: r.name, amount: natural(r) })).filter((s) => s.amount !== 0);
  const income = pick("INCOME");
  const cost = pick("COST");
  const expenses = pick("EXPENSE");
  const totalIncome = sum(income.map((s) => s.amount));
  const totalCost = sum(cost.map((s) => s.amount));
  const totalExpenses = sum(expenses.map((s) => s.amount));
  return { income, cost, expenses, totalIncome, totalCost, grossProfit: fromCents(cents(totalIncome) - cents(totalCost)), totalExpenses, netResult: fromCents(cents(totalIncome) - cents(totalCost) - cents(totalExpenses)) };
}

export type BalanceSheet = { assets: Section; liabilities: Section; equity: Section; netResult: number; totalAssets: number; totalLiabilities: number; totalEquity: number; balanced: boolean };

/** Balance general: activo = pasivo + patrimonio (con el resultado del ejercicio dentro del patrimonio). */
export function balanceSheet(rows: readonly LedgerRow[]): BalanceSheet {
  const tb = trialBalance(rows).rows;
  const pick = (t: AccountType): Section => tb.filter((r) => r.type === t).map((r) => ({ account: r.account, name: r.name, amount: natural(r) })).filter((s) => s.amount !== 0);
  const assets = pick("ASSET");
  const liabilities = pick("LIABILITY");
  const equity = pick("EQUITY");
  const { netResult } = incomeStatement(rows);
  const totalAssets = sum(assets.map((s) => s.amount));
  const totalLiabilities = sum(liabilities.map((s) => s.amount));
  const totalEquity = fromCents(cents(sum(equity.map((s) => s.amount))) + cents(netResult));
  return { assets, liabilities, equity, netResult, totalAssets, totalLiabilities, totalEquity, balanced: cents(totalAssets) === cents(totalLiabilities) + cents(totalEquity) };
}

export type JournalGroup = { number: number; date: string; description: string; event: string; lines: { account: string; name: string; debit: number; credit: number; party: string | null }[] };

/** Libro diario: asiento por asiento, en orden. */
export function journal(rows: readonly LedgerRow[]): JournalGroup[] {
  const by = new Map<number, JournalGroup>();
  for (const r of rows) {
    const g = by.get(r.entryNumber) ?? { number: r.entryNumber, date: r.date, description: r.description, event: r.event, lines: [] };
    g.lines.push({ account: r.account, name: r.accountName, debit: r.debit, credit: r.credit, party: r.partyName ?? null });
    by.set(r.entryNumber, g);
  }
  return [...by.values()].sort((a, b) => a.number - b.number);
}

export type LedgerLine = { date: string; entryNumber: number; description: string; debit: number; credit: number; balance: number };

/** Libro mayor de una cuenta: movimientos con su saldo corrido (positivo = en su naturaleza). */
export function generalLedger(rows: readonly LedgerRow[], account: string): { lines: LedgerLine[]; balance: number } {
  const mine = rows.filter((r) => r.account === account).sort((a, b) => a.entryNumber - b.entryNumber);
  if (!mine.length) return { lines: [], balance: 0 };
  const sign = mine[0]!.type === "ASSET" || mine[0]!.type === "EXPENSE" || mine[0]!.type === "COST" ? 1 : -1;
  let run = 0;
  const lines = mine.map((r) => {
    run += sign * (cents(r.debit) - cents(r.credit));
    return { date: r.date, entryNumber: r.entryNumber, description: r.description, debit: r.debit, credit: r.credit, balance: fromCents(run) };
  });
  return { lines, balance: fromCents(run) };
}

export type AuxRow = { party: string; doc: string | null; debit: number; credit: number; balance: number };

/** Auxiliar por tercero de una cuenta (p. ej. clientes 1305: qué debe cada uno). */
export function auxiliaryByParty(rows: readonly LedgerRow[], account: string): AuxRow[] {
  const by = new Map<string, { doc: string | null; d: number; c: number }>();
  for (const r of rows.filter((x) => x.account === account)) {
    const key = r.partyName ?? "Sin tercero";
    const e = by.get(key) ?? { doc: r.partyDoc ?? null, d: 0, c: 0 };
    e.d += cents(r.debit);
    e.c += cents(r.credit);
    by.set(key, e);
  }
  return [...by.entries()].map(([party, e]) => ({ party, doc: e.doc, debit: fromCents(e.d), credit: fromCents(e.c), balance: fromCents(e.d - e.c) })).sort((a, b) => a.party.localeCompare(b.party));
}

/* ---------------------------- Archivos para el contador ---------------------------- */

const money = (n: number) => n.toFixed(2);

/** Movimiento contable plano: una línea por renglón de cada asiento (lo que importa un software contable). */
export function journalCsv(rows: readonly LedgerRow[]): string {
  return toCsv(["Fecha", "Comprobante", "Cuenta", "Nombre de la cuenta", "Documento tercero", "Tercero", "Centro de costo", "Descripción", "Débito", "Crédito"], [...rows].sort((a, b) => a.entryNumber - b.entryNumber).map((r) => [r.date, String(r.entryNumber), r.account, r.accountName, r.partyDoc ?? "", r.partyName ?? "", r.costCenter ?? "", r.description, money(r.debit), money(r.credit)]));
}

export function trialBalanceCsv(tb: TrialBalance): string {
  return toCsv(["Cuenta", "Nombre", "Débitos", "Créditos", "Saldo débito", "Saldo crédito"], [...tb.rows.map((r) => [r.account, r.name, money(r.debit), money(r.credit), money(r.balanceDebit), money(r.balanceCredit)]), ["", "TOTALES", money(tb.totalDebit), money(tb.totalCredit), money(tb.totalBalanceDebit), money(tb.totalBalanceCredit)]]);
}

export function statementCsv(title: string, sections: { name: string; items: Section; total: number }[], footer: [string, number][]): string {
  const rows: string[][] = [];
  for (const s of sections) {
    rows.push([s.name, "", ""]);
    for (const i of s.items) rows.push([i.account, i.name, money(i.amount)]);
    rows.push(["", `Total ${s.name.toLowerCase()}`, money(s.total)]);
  }
  for (const [label, v] of footer) rows.push(["", label, money(v)]);
  return toCsv([title, "Nombre", "Valor"], rows);
}
