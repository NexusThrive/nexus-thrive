import { describe, expect, it } from "vitest";
import { isQuoteExpired, quoteCode, splitDeposit, validateQuote } from "@/lib/business/sales/sales-quotes";

describe("cotización comercial (HU-cotizacion-01)", () => {
  const ok = { title: "Camisetas con logo", depositPct: 50, validUntil: "2026-11-30", lines: [{ productId: "p1", quantity: 40, unitPrice: 40_000 }] };
  it("valida título, anticipo, vigencia y líneas", () => {
    expect(validateQuote(ok)).toBeNull();
    expect(validateQuote({ ...ok, title: "ab" })).toContain("trata");
    expect(validateQuote({ ...ok, depositPct: 120 })).toContain("anticipo");
    expect(validateQuote({ ...ok, validUntil: "30/11/2026" })).toContain("vigencia");
    expect(validateQuote({ ...ok, lines: [] })).toContain("al menos");
    expect(validateQuote({ ...ok, lines: [{ productId: "", quantity: 1, unitPrice: 1 }] })).toContain("catálogo");
    expect(validateQuote({ ...ok, lines: [{ productId: "p", quantity: 1.5, unitPrice: 1 }] })).toContain("entero");
    expect(validateQuote({ ...ok, lines: [{ productId: "p", quantity: 1, unitPrice: -1 }] })).toContain("negativo");
  });
  it("el anticipo y el saldo suman exactamente el total", () => {
    expect(splitDeposit(1_600_000, 50)).toEqual({ deposit: 800_000, balance: 800_000 });
    const odd = splitDeposit(100_001, 33);
    expect(odd.deposit + odd.balance).toBeCloseTo(100_001, 2);
    expect(splitDeposit(500_000, 100)).toEqual({ deposit: 500_000, balance: 0 });
    expect(splitDeposit(500_000, 0)).toEqual({ deposit: 0, balance: 500_000 });
  });
  it("vence después de su último día", () => {
    expect(isQuoteExpired("2026-11-06", "2026-11-07")).toBe(true);
    expect(isQuoteExpired("2026-11-07", "2026-11-07")).toBe(false);
    expect(isQuoteExpired(null, "2026-11-07")).toBe(false);
    expect(quoteCode(42)).toBe("COT-0042");
  });
});
