import { describe, expect, it } from "vitest";
import { cartTotals, settlePayments, tipFor } from "./cart";

const lines = [
  { description: "Proteína", quantity: 2, unitPrice: 100_000, discountPct: 10, taxRatePct: 19 },
  { description: "Barra", quantity: 3, unitPrice: 5_000 },
];

describe("carrito del POS", () => {
  it("totales con descuento por línea e IVA", () => {
    expect(cartTotals(lines)).toEqual({ subtotal: 215_000, discountTotal: 20_000, taxTotal: 34_200, total: 229_200 });
  });
  it("propina por porcentaje (sobre la base) o fija, nunca negativa", () => {
    const t = cartTotals(lines);
    expect(tipFor({ pct: 10 }, t)).toBe(19_500);
    expect(tipFor({ fixed: 3000 }, t)).toBe(3000);
    expect(tipFor({ fixed: -5 }, t)).toBe(0);
    expect(tipFor({}, t)).toBe(0);
  });
});

describe("pago mixto", () => {
  it("efectivo + Nequi exactos", () => {
    expect(settlePayments(229_200, [{ method: "CASH", amount: 100_000 }, { method: "NEQUI", amount: 129_200 }])).toEqual({
      applied: [{ method: "CASH", amount: 100_000 }, { method: "NEQUI", amount: 129_200 }], change: 0, paid: 229_200,
    });
  });
  it("el efectivo que se pasa es cambio y se descuenta del efectivo", () => {
    const r = settlePayments(229_200, [{ method: "NEQUI", amount: 129_200 }, { method: "CASH", amount: 120_000 }]);
    expect(r).toEqual({ applied: [{ method: "NEQUI", amount: 129_200 }, { method: "CASH", amount: 100_000 }], change: 20_000, paid: 249_200 });
  });
  it("falta plata, o se pasa un medio que no es efectivo", () => {
    expect(settlePayments(1000, [{ method: "CASH", amount: 500 }])).toEqual({ error: expect.stringContaining("Faltan") });
    expect(settlePayments(1000, [{ method: "NEQUI", amount: 1500 }])).toEqual({ error: expect.stringContaining("Solo el efectivo") });
    expect(settlePayments(1000, [])).toEqual({ error: "Agrega al menos un pago." });
  });
});
