import { describe, expect, it } from "vitest";
import { auxiliaryByParty, balanceSheet, generalLedger, incomeStatement, journal, journalCsv, trialBalance, trialBalanceCsv } from "./reports";
import type { LedgerRow } from "./reports";

/**
 * Muestra revisable a mano (como la revisaría un contador): capital, una compra de mercancía con IVA, dos ventas
 * (una pagada, una a crédito), su costo y un gasto.
 *  1. Aporte de capital:      D Bancos 5.000.000            C Capital 5.000.000
 *  2. Compra mercancía:       D Inventario 1.000.000 + D IVA descontable 190.000   C Proveedores 1.190.000
 *  3. Venta de contado:       D Clientes 595.000            C Ingresos 500.000 + C IVA por pagar 95.000
 *  4. Cobro de esa venta:     D Bancos 595.000              C Clientes 595.000
 *  5. Costo de esa venta:     D Costo de ventas 300.000     C Inventario 300.000
 *  6. Venta a crédito:        D Clientes 238.000            C Ingresos 200.000 + C IVA por pagar 38.000
 *  7. Gasto de servicios:     D Servicios 80.000            C Bancos 80.000
 */
const L = (n: number, account: string, accountName: string, type: LedgerRow["type"], debit: number, credit: number, extra: Partial<LedgerRow> = {}): LedgerRow => ({ date: "2026-10-1" + n, entryNumber: n, description: `Asiento ${n}`, event: "MANUAL", account, accountName, type, debit, credit, ...extra });
const SAMPLE: LedgerRow[] = [
  L(1, "1110", "Bancos", "ASSET", 5_000_000, 0), L(1, "3105", "Capital", "EQUITY", 0, 5_000_000),
  L(2, "1435", "Inventario", "ASSET", 1_000_000, 0), L(2, "1355", "IVA descontable", "ASSET", 190_000, 0), L(2, "2205", "Proveedores", "LIABILITY", 0, 1_190_000, { partyName: "Distribuidora Sur", partyDoc: "900111" }),
  L(3, "1305", "Clientes", "ASSET", 595_000, 0, { partyName: "María Pérez", partyDoc: "1020" }), L(3, "4135", "Ingresos por ventas", "INCOME", 0, 500_000), L(3, "2408", "IVA por pagar", "LIABILITY", 0, 95_000),
  L(4, "1110", "Bancos", "ASSET", 595_000, 0), L(4, "1305", "Clientes", "ASSET", 0, 595_000, { partyName: "María Pérez", partyDoc: "1020" }),
  L(5, "6135", "Costo de ventas", "COST", 300_000, 0), L(5, "1435", "Inventario", "ASSET", 0, 300_000),
  L(6, "1305", "Clientes", "ASSET", 238_000, 0, { partyName: "Gimnasio Atlas", partyDoc: "9005" }), L(6, "4135", "Ingresos por ventas", "INCOME", 0, 200_000), L(6, "2408", "IVA por pagar", "LIABILITY", 0, 38_000),
  L(7, "5135", "Servicios", "EXPENSE", 80_000, 0), L(7, "1110", "Bancos", "ASSET", 0, 80_000),
];

describe("estados financieros sobre una muestra revisable", () => {
  it("el balance de prueba cuadra y cada saldo es el esperado", () => {
    const tb = trialBalance(SAMPLE);
    expect(tb.balanced).toBe(true);
    expect(tb.totalDebit).toBe(tb.totalCredit);
    expect(tb.totalDebit).toBe(5_000_000 + 1_190_000 + 595_000 + 595_000 + 300_000 + 238_000 + 80_000);
    const get = (c: string) => tb.rows.find((r) => r.account === c)!;
    expect(get("1110")).toMatchObject({ debit: 5_595_000, credit: 80_000, balanceDebit: 5_515_000, balanceCredit: 0 });
    expect(get("1305")).toMatchObject({ balanceDebit: 238_000 });
    expect(get("1435")).toMatchObject({ balanceDebit: 700_000 });
    expect(get("2408")).toMatchObject({ balanceCredit: 133_000 });
    expect(get("4135")).toMatchObject({ balanceCredit: 700_000 });
  });
  it("estado de resultados: ingresos 700.000 − costo 300.000 − gastos 80.000 = 320.000", () => {
    const is = incomeStatement(SAMPLE);
    expect(is).toMatchObject({ totalIncome: 700_000, totalCost: 300_000, grossProfit: 400_000, totalExpenses: 80_000, netResult: 320_000 });
  });
  it("balance general: activo = pasivo + patrimonio (con el resultado dentro)", () => {
    const bs = balanceSheet(SAMPLE);
    // Activo: 5.515.000 + 238.000 + 700.000 + 190.000 = 6.643.000 · Pasivo: 1.190.000 + 133.000 = 1.323.000 · Patrimonio: 5.000.000 + 320.000
    expect(bs).toMatchObject({ totalAssets: 6_643_000, totalLiabilities: 1_323_000, totalEquity: 5_320_000, netResult: 320_000, balanced: true });
  });
  it("libro diario y libro mayor con saldo corrido", () => {
    expect(journal(SAMPLE).map((g) => g.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(journal(SAMPLE)[1]!.lines).toHaveLength(3);
    const m = generalLedger(SAMPLE, "1110");
    expect(m.lines.map((l) => l.balance)).toEqual([5_000_000, 5_595_000, 5_515_000]);
    expect(m.balance).toBe(5_515_000);
    expect(generalLedger(SAMPLE, "2408").balance).toBe(133_000); // pasivo: saldo positivo en su naturaleza
    expect(generalLedger(SAMPLE, "9999")).toEqual({ lines: [], balance: 0 });
  });
  it("auxiliar por tercero: quién debe en clientes", () => {
    expect(auxiliaryByParty(SAMPLE, "1305")).toEqual([
      { party: "Gimnasio Atlas", doc: "9005", debit: 238_000, credit: 0, balance: 238_000 },
      { party: "María Pérez", doc: "1020", debit: 595_000, credit: 595_000, balance: 0 },
    ]);
  });
  it("los archivos para el contador traen encabezados, totales y neutralizan fórmulas", () => {
    const csv = journalCsv(SAMPLE);
    expect(csv.split("\r\n")[0]).toContain("Fecha,Comprobante,Cuenta");
    expect(csv.split("\r\n").length).toBe(SAMPLE.length + 2); // encabezado + filas + cierre vacío
    expect(journalCsv([{ ...SAMPLE[0]!, description: "=CMD()" }])).toContain("'=CMD()");
    expect(trialBalanceCsv(trialBalance(SAMPLE))).toContain("TOTALES");
  });
  it("una muestra descuadrada se detecta", () => {
    expect(trialBalance([...SAMPLE, L(8, "1105", "Caja", "ASSET", 1, 0)]).balanced).toBe(false);
  });
});
