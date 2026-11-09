import { describe, expect, it } from "vitest";
import { summarizeValuation } from "@/lib/business/inventory/valuation";

describe("valorización del inventario", () => {
  it("sin existencias no inventa nada", () => {
    expect(summarizeValuation([])).toMatchObject({ total: 0, units: 0, products: 0, byCategory: [], top: [] });
  });
  it("suma las bodegas de un producto, agrupa por categoría y calcula la participación", () => {
    const v = summarizeValuation([
      { productId: "a", name: "Whey", category: "Suplementos", units: 8, value: 440_000 },
      { productId: "a", name: "Whey", category: "Suplementos", units: 2, value: 110_000 },
      { productId: "b", name: "Shaker", category: null, units: 15, value: 135_000 },
      { productId: "c", name: "Agotado", category: "Suplementos", units: 0, value: 0 },
    ]);
    expect(v).toMatchObject({ total: 685_000, units: 25, products: 2 });
    expect(v.byCategory.map((c) => [c.category, c.value, c.share])).toEqual([["Suplementos", 550_000, 80.3], ["Sin categoría", 135_000, 19.7]]);
    expect(v.top[0]).toMatchObject({ productId: "a", units: 10, value: 550_000 });
  });
});
