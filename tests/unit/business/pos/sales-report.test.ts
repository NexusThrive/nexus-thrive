import { describe, expect, it } from "vitest";
import { periodStart, summarizeSales, type ReportSale } from "@/lib/business/pos/sales-report";

const sale = (id: string, total: number, cashierId: string | null, lines: ReportSale["lines"], payments: ReportSale["payments"], tip = 0): ReportSale => ({ id, total, tip, cashierId, lines, payments });

describe("informe de ventas", () => {
  it("sin ventas devuelve ceros", () => {
    expect(summarizeSales([])).toMatchObject({ count: 0, total: 0, average: 0, topProducts: [], byCashier: [], byMethod: [] });
  });
  it("suma, promedia y ordena por lo vendido", () => {
    const r = summarizeSales([
      sale("1", 100, "a", [{ productId: "p1", name: "Whey", quantity: 1, total: 100 }], [{ method: "CASH", amount: 100 }]),
      sale("2", 50, "b", [{ productId: "p2", name: "Barra", quantity: 5, total: 30 }, { productId: "p1", name: "Whey", quantity: 1, total: 20 }], [{ method: "TRANSFER", amount: 30 }, { method: "CASH", amount: 20 }], 5),
    ]);
    expect(r).toMatchObject({ count: 2, total: 150, tips: 5, average: 75 });
    expect(r.topProducts.map((p) => [p.name, p.units, p.total])).toEqual([["Whey", 2, 120], ["Barra", 5, 30]]);
    expect(r.byCashier.map((c) => [c.cashierId, c.total])).toEqual([["a", 100], ["b", 50]]);
    expect(r.byMethod).toEqual([{ method: "CASH", total: 120 }, { method: "TRANSFER", total: 30 }]);
  });
  it("el periodo empieza a la medianoche de Bogotá", () => {
    const now = new Date("2026-11-08T03:00:00Z"); // 7 p. m. del 7 en Bogotá
    expect(periodStart("hoy", now).toISOString()).toBe("2026-11-07T05:00:00.000Z");
    expect(periodStart("7d", now).toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(periodStart("mes", now).toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(periodStart("30d", now).toISOString()).toBe("2026-10-09T05:00:00.000Z");
  });
});
