import { describe, expect, it } from "vitest";
import { buildCategoryTree, categoryAndChildren, categoryPath, checkCategoryParent, type CategoryRow } from "@/lib/business/catalog/category-tree";
import { MAX_VARIANTS, missingVariants, variantCombinations, variantCount, type AttributeLine } from "@/lib/business/catalog/variant-matrix";

const rows: CategoryRow[] = [
  { id: "ropa", name: "Ropa", parentId: null, position: 1, products: 2 },
  { id: "cam", name: "Camisetas", parentId: "ropa", position: 0, products: 5 },
  { id: "pan", name: "Pantalones", parentId: "ropa", position: 1, products: 3 },
  { id: "acc", name: "Accesorios", parentId: null, position: 0, products: 4 },
];

describe("árbol de categorías", () => {
  it("ordena por posición y suma los productos de las subcategorías", () => {
    const tree = buildCategoryTree(rows);
    expect(tree.map((n) => n.name)).toEqual(["Accesorios", "Ropa"]);
    const ropa = tree[1]!;
    expect(ropa.children.map((c) => c.name)).toEqual(["Camisetas", "Pantalones"]);
    expect(ropa.total).toBe(10);
  });

  it("nombra la ruta y trae a las hijas para filtrar", () => {
    expect(categoryPath(rows, "cam")).toBe("Ropa › Camisetas");
    expect(categoryPath(rows, "acc")).toBe("Accesorios");
    expect(categoryPath(rows, "nada")).toBe("");
    expect(categoryAndChildren(rows, "ropa").sort()).toEqual(["cam", "pan", "ropa"]);
  });

  it("solo dos niveles, sin ciclos y sin nombres repetidos entre hermanas", () => {
    expect(checkCategoryParent(rows, { name: "Zapatos", parentId: "cam" })).toMatchObject({ ok: false });
    expect(checkCategoryParent(rows, { id: "ropa", name: "Ropa", parentId: "acc" })).toMatchObject({ ok: false, message: expect.stringContaining("subcategorías") });
    expect(checkCategoryParent(rows, { id: "cam", name: "Camisetas", parentId: "cam" })).toMatchObject({ ok: false });
    expect(checkCategoryParent(rows, { name: "camisetas", parentId: "ropa" })).toMatchObject({ ok: false, message: expect.stringContaining("Ya existe") });
    expect(checkCategoryParent(rows, { name: "Camisetas", parentId: null })).toEqual({ ok: true });
    expect(checkCategoryParent(rows, { name: "  ", parentId: null })).toMatchObject({ ok: false });
  });
});

describe("variantes por atributos", () => {
  const talla: AttributeLine = { attributeId: "t", attributeName: "Talla", variantMode: "ALWAYS", values: [{ id: "s", name: "S" }, { id: "m", name: "M" }] };
  const color: AttributeLine = { attributeId: "c", attributeName: "Color", variantMode: "ALWAYS", values: [{ id: "r", name: "Rojo" }, { id: "a", name: "Azul" }] };
  const texto: AttributeLine = { attributeId: "x", attributeName: "Texto", variantMode: "CUSTOM", values: [] };
  const material: AttributeLine = { attributeId: "mat", attributeName: "Material", variantMode: "NEVER", values: [{ id: "alg", name: "Algodón" }] };

  it("multiplica los atributos que crean variantes e ignora los informativos y los personalizados", () => {
    const combos = variantCombinations("Camiseta", [talla, color, texto, material]);
    expect(combos).toHaveLength(4);
    expect(combos[0]).toEqual({ name: "Camiseta · S / Rojo", attributes: { Talla: "S", Color: "Rojo" } });
    expect(variantCount([talla, color, texto, material])).toBe(4);
    expect(variantCombinations("Taza", [texto, material])).toEqual([]);
    expect(variantCount([texto])).toBe(0);
  });

  it("solo propone las que faltan, comparando por atributos y no por nombre ni por orden", () => {
    const combos = variantCombinations("Camiseta", [talla, color]);
    const existing = [{ attributes: { Color: "Rojo", Talla: "S" } }];
    const missing = missingVariants(combos, existing);
    expect(missing).toHaveLength(3);
    expect(missing.some((m) => m.attributes.Talla === "S" && m.attributes.Color === "Rojo")).toBe(false);
  });

  it("avisa cuánto pesa una matriz grande", () => {
    const big: AttributeLine = { attributeId: "n", attributeName: "N", variantMode: "ALWAYS", values: Array.from({ length: 11 }, (_, i) => ({ id: `${i}`, name: `${i}` })) };
    expect(variantCount([big, big])).toBe(121);
    expect(variantCount([big, big])).toBeGreaterThan(MAX_VARIANTS);
  });
});
