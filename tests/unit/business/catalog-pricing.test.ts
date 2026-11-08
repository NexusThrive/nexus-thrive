import { describe, expect, it } from "vitest";
import { tierPrice, validateTiers } from "@/lib/business/catalog/pricing";

describe("precio con listas", () => {
  const tiers = [{ minQty: 6, price: 80 }, { minQty: 12, price: 70 }];
  it("sin lista usa el precio del producto; con lista, el de la lista", () => {
    expect(tierPrice(100, null, undefined, 1)).toBe(100);
    expect(tierPrice(100, 90, [], 3)).toBe(90);
  });
  it("aplica el escalón más alto que la cantidad alcanza", () => {
    expect(tierPrice(100, 90, tiers, 5)).toBe(90);
    expect(tierPrice(100, 90, tiers, 6)).toBe(80);
    expect(tierPrice(100, null, tiers, 11)).toBe(80);
    expect(tierPrice(100, 90, tiers, 12)).toBe(70);
    expect(tierPrice(100, 90, tiers, 99)).toBe(70);
  });
  it("valida los escalones", () => {
    expect(validateTiers(tiers)).toBeNull();
    expect(validateTiers([{ minQty: 1, price: 5 }])).toMatch(/2 o más/);
    expect(validateTiers([{ minQty: 3, price: -1 }])).toMatch(/negativo/);
    expect(validateTiers([{ minQty: 3, price: 5 }, { minQty: 3, price: 4 }])).toMatch(/dos escalones/);
    expect(validateTiers(Array.from({ length: 11 }, (_, i) => ({ minQty: i + 2, price: 1 })))).toMatch(/hasta 10/);
  });
});
