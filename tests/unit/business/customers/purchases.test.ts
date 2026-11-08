import { describe, expect, it } from "vitest";
import { summarizePurchases } from "@/lib/business/customers/purchases";

const line = (productId: string | null, name: string, quantity: number, total: number, date: string) => ({ productId, name, quantity, total, date });

describe("compras de un cliente", () => {
  it("sin compras no inventa nada", () => {
    expect(summarizePurchases([])).toMatchObject({ products: [], orders: 0, spent: 0, firstDate: null, lastDate: null, averageGapDays: null, nextExpected: null });
  });
  it("ordena los productos por lo gastado y cuenta cuántas veces los compró", () => {
    const s = summarizePurchases([line("a", "Whey", 1, 100, "2026-01-01T10:00:00Z"), line("a", "Whey", 2, 200, "2026-01-31T10:00:00Z"), line("b", "Barra", 3, 15, "2026-01-31T10:00:00Z")]);
    expect(s.products.map((p) => [p.name, p.units, p.spent, p.times])).toEqual([["Whey", 3, 300, 2], ["Barra", 3, 15, 1]]);
    expect(s.spent).toBe(315);
    expect(s.orders).toBe(2);
  });
  it("calcula cada cuánto vuelve y cuándo se espera la próxima compra", () => {
    const s = summarizePurchases([line("a", "Whey", 1, 1, "2026-01-01T00:00:00Z"), line("a", "Whey", 1, 1, "2026-01-31T00:00:00Z"), line("a", "Whey", 1, 1, "2026-03-02T00:00:00Z")]);
    expect(s.averageGapDays).toBe(30);
    expect(s.firstDate).toBe("2026-01-01");
    expect(s.lastDate).toBe("2026-03-02");
    expect(s.nextExpected).toBe("2026-04-01");
  });
  it("una sola fecha no da ritmo de recompra; las líneas sin producto se juntan por nombre", () => {
    const s = summarizePurchases([line(null, "Servicio", 1, 5, "2026-01-01T00:00:00Z"), line(null, "servicio", 1, 5, "2026-01-01T00:00:00Z")]);
    expect(s.averageGapDays).toBeNull();
    expect(s.products).toHaveLength(1);
  });
});
