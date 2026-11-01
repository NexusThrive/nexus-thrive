import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./puc";
import { GENESIS, cents, entryHash, linesFromRule, reverseLines, totals, validateEntry } from "./ledger";

const rule = (event: string) => DEFAULT_RULES.find((r) => r.event === event)!.lines;

describe("motor contable", () => {
  it("una venta con IVA genera un asiento cuadrado: cliente contra ingreso e IVA", () => {
    // 1.000.000 − 100.000 de descuento = base 900.000; IVA 19 % = 171.000; total 1.071.000
    const lines = linesFromRule(rule("SALE"), { total: 1_071_000, subtotal: 900_000, tax: 171_000 });
    expect(lines.map((l) => [l.account, l.debit, l.credit])).toEqual([["1305", 1_071_000, 0], ["4135", 0, 900_000], ["2408", 0, 171_000]]);
    expect(validateEntry(lines)).toBeNull();
  });
  it("las líneas de monto cero no se escriben (venta sin IVA)", () => {
    const lines = linesFromRule(rule("SALE"), { total: 50_000, subtotal: 50_000, tax: 0 });
    expect(lines.map((l) => l.account)).toEqual(["1305", "4135"]);
    expect(validateEntry(lines)).toBeNull();
  });
  it("costo de la venta y cobro cuadran", () => {
    expect(validateEntry(linesFromRule(rule("SALE_COST"), { cost: 62_500.5 }))).toBeNull();
    expect(validateEntry(linesFromRule(rule("PAYMENT_RECEIVED"), { payment: 300_000 }))).toBeNull();
    expect(validateEntry(linesFromRule(rule("PURCHASE_RECEIVED"), { total: 119_000, subtotal: 100_000, tax: 19_000 }))).toBeNull();
  });
  it("detecta lo que no cuadra o está mal armado", () => {
    expect(validateEntry(linesFromRule(rule("SALE"), { total: 100, subtotal: 50, tax: 10 }))).toContain("no cuadra");
    expect(validateEntry([{ account: "1105", debit: 10, credit: 0 }])).toContain("al menos dos");
    expect(validateEntry([{ account: "1105", debit: 10, credit: 10 }, { account: "4135", debit: 0, credit: 0 }])).toContain("solo débito o solo crédito");
  });
  it("sin errores de redondeo con centavos", () => {
    const lines = linesFromRule(rule("SALE"), { total: 0.3, subtotal: 0.2, tax: 0.1 });
    expect(totals(lines)).toEqual({ debit: 0.3, credit: 0.3 });
    expect(cents(0.1 + 0.2)).toBe(30);
  });
  it("el reverso intercambia débito y crédito y también cuadra", () => {
    const lines = linesFromRule(rule("SALE"), { total: 119_000, subtotal: 100_000, tax: 19_000 });
    const rev = reverseLines(lines);
    expect(rev[0]).toMatchObject({ account: "1305", debit: 0, credit: 119_000 });
    expect(validateEntry(rev)).toBeNull();
    const sum = totals([...lines, ...rev]);
    expect(sum.debit).toBe(sum.credit);
  });
  it("el sello cambia si cambia cualquier dato o el asiento anterior", () => {
    const base = { number: 1, date: "2026-10-24", event: "SALE", sourceType: "DOCUMENT", sourceId: "d1", lines: linesFromRule(rule("SALE"), { total: 100, subtotal: 100 }) };
    const h = entryHash(GENESIS, base);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(entryHash(GENESIS, base)).toBe(h);
    expect(entryHash(GENESIS, { ...base, lines: linesFromRule(rule("SALE"), { total: 101, subtotal: 101 }) })).not.toBe(h);
    expect(entryHash(GENESIS, { ...base, date: "2026-10-25" })).not.toBe(h);
    expect(entryHash("1".repeat(64), base)).not.toBe(h);
    expect(entryHash(GENESIS, { ...base, lines: [...base.lines].reverse() })).toBe(h); // el orden de las líneas no cambia el sello
  });
});
