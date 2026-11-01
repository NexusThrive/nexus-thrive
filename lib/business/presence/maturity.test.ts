import { describe, expect, it } from "vitest";
import { computeMaturity, type MaturityInput } from "./maturity";

const zero: MaturityInput = { invoices30d: 0, productsActive: 0, stockMovements30d: 0, cashSessions30d: 0, customers: 0, customersWithPurchase30d: 0, expenses30d: 0 };
const full: MaturityInput = { invoices30d: 40, productsActive: 30, stockMovements30d: 25, cashSessions30d: 25, customers: 80, customersWithPurchase30d: 40, expenses30d: 20 };

describe("madurez NEXUS", () => {
  it("un negocio que no usa nada queda en inicial y con una señal por dimensión", () => {
    const m = computeMaturity(zero);
    expect(m).toMatchObject({ score: 0, level: "INICIAL" });
    expect(m.signals).toHaveLength(5);
    expect(m.signals[0]!.action.href.startsWith("/")).toBe(true);
  });
  it("uno que lo usa todo queda consolidado y sin señales", () => {
    const m = computeMaturity(full);
    expect(m).toMatchObject({ score: 100, level: "CONSOLIDADO", signals: [] });
  });
  it("las señales salen de menor a mayor puntaje y solo bajo 50", () => {
    const m = computeMaturity({ ...full, invoices30d: 4, expenses30d: 0 });
    expect(m.signals.map((s) => s.key)).toEqual(["expenses", "sales"]);
    expect(m.level).toBe("EN_CRECIMIENTO");
  });
  it("sin productos, el inventario es 0 aunque haya movimientos", () => {
    expect(computeMaturity({ ...full, productsActive: 0 }).dimensions.find((d) => d.key === "inventory")!.score).toBe(0);
  });
  it("los puntajes nunca pasan de 100", () => {
    expect(computeMaturity({ ...full, invoices30d: 9999 }).dimensions.every((d) => d.score <= 100)).toBe(true);
  });
});
