import { describe, expect, it } from "vitest";
import { isValidGtin } from "@/lib/business/catalog/barcode";
import { EMPTY_PRODUCT_DRAFT, generateInternalEan13, marginPct, priceWithoutTax, suggestSku, validateProductForm, type ProductFormDraft } from "@/lib/business/catalog/product-form";

const ok = (patch: Partial<ProductFormDraft> = {}): ProductFormDraft => ({ ...EMPTY_PRODUCT_DRAFT, name: "Camiseta", price: 50_000, ...patch });

describe("formulario de producto", () => {
  it("pide nombre y precio", () => {
    expect(validateProductForm(ok())).toEqual({ ok: true });
    expect(validateProductForm(ok({ name: " " }))).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    expect(validateProductForm(ok({ price: null }))).toMatchObject({ ok: false, errors: { price: expect.any(String) } });
  });

  it("revisa existencias, máximo contra mínimo, plan, cupo y código", () => {
    const r = validateProductForm(ok({ initialStock: 1.5, minStock: 10, maxStock: 5, kind: "PLAN", capacity: 0, barcode: "ñ" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["barcode", "capacity", "durationDays", "initialStock", "maxStock"]);
  });

  it("calcula el margen sobre el precio sin IVA y lo omite sin datos", () => {
    expect(priceWithoutTax(11_900, 19, "GRAVADO")).toBe(10_000);
    expect(priceWithoutTax(11_900, 19, "EXENTO")).toBe(11_900);
    expect(marginPct(11_900, 6_000, 19, "GRAVADO")).toBe(40);
    expect(marginPct(null, 6_000)).toBeNull();
    expect(marginPct(10_000, null)).toBeNull();
  });

  it("genera un SKU legible y un EAN-13 interno con dígito verificador válido", () => {
    expect(suggestSku("Camiseta básica", 4821)).toBe("CAM-4821");
    expect(suggestSku("  ", 7)).toBe("XXX-0007");
    for (const seed of [1, 123456789, 987654321]) {
      const code = generateInternalEan13(seed);
      expect(code).toHaveLength(13);
      expect(code.startsWith("20")).toBe(true);
      expect(isValidGtin(code)).toBe(true);
    }
  });
});
