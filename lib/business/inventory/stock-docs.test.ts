import { describe, expect, test } from "vitest";
import { countCode, countDifference, countSummary, reorderThreshold, suggestedOrder, transferCode, validateLevels, validateTransfer } from "./stock-docs";

describe("traslados, conteos y reposición (puro)", () => {
  test("consecutivos legibles", () => {
    expect(transferCode(7)).toBe("TR-0007");
    expect(countCode(12)).toBe("CT-0012");
  });
  test("validación del traslado", () => {
    const ok = { fromWarehouseId: "a", toWarehouseId: "b", lines: [{ productId: "p", quantity: 2 }] };
    expect(validateTransfer(ok)).toBeNull();
    expect(validateTransfer({ ...ok, toWarehouseId: "a" })).toMatch(/distintas/);
    expect(validateTransfer({ ...ok, fromWarehouseId: "" })).toMatch(/origen/);
    expect(validateTransfer({ ...ok, lines: [] })).toMatch(/al menos/);
    expect(validateTransfer({ ...ok, lines: [{ productId: "p", quantity: 0 }] })).toMatch(/cantidad/);
    expect(validateTransfer({ ...ok, lines: [{ productId: "p", quantity: 1.5 }] })).toMatch(/cantidad/);
    expect(validateTransfer({ ...ok, lines: [{ productId: "p", quantity: 1 }, { productId: "p", quantity: 1 }] })).toMatch(/repetido/);
  });
  test("diferencias de un conteo", () => {
    expect(countDifference({ expected: 10, counted: 8 })).toBe(-2);
    expect(countDifference({ expected: 10, counted: null })).toBeNull();
    expect(countSummary([{ expected: 10, counted: 8 }, { expected: 5, counted: 7 }, { expected: 3, counted: 3 }, { expected: 4, counted: null }])).toEqual({ total: 4, counted: 3, withDifference: 2, surplus: 2, shortage: 2 });
  });
  test("cuándo y cuánto reponer", () => {
    expect(reorderThreshold({ minStock: 5, reorderPoint: 8 })).toBe(8);
    expect(reorderThreshold({ minStock: 5, reorderPoint: null })).toBe(5);
    expect(reorderThreshold({ minStock: 0, reorderPoint: null })).toBeNull();
    // Hasta el máximo, descontando lo ya pedido.
    expect(suggestedOrder({ stock: 3, minStock: 5, maxStock: 20, reorderPoint: 8, onOrder: 4 })).toBe(13);
    // Sin máximo: el doble del punto de reorden.
    expect(suggestedOrder({ stock: 3, minStock: 5, maxStock: null, reorderPoint: 8, onOrder: 0 })).toBe(13);
    // Aún hay suficiente, o no hay niveles definidos.
    expect(suggestedOrder({ stock: 9, minStock: 5, maxStock: 20, reorderPoint: 8, onOrder: 0 })).toBe(0);
    expect(suggestedOrder({ stock: 0, minStock: 0, maxStock: null, reorderPoint: null, onOrder: 0 })).toBe(0);
    // Ya pedido de sobra.
    expect(suggestedOrder({ stock: 3, minStock: 5, maxStock: 10, reorderPoint: 8, onOrder: 20 })).toBe(0);
  });
  test("coherencia de los niveles", () => {
    expect(validateLevels({ minStock: 5, maxStock: 20, reorderPoint: 8 })).toBeNull();
    expect(validateLevels({ minStock: 5, maxStock: null, reorderPoint: null })).toBeNull();
    expect(validateLevels({ minStock: 5, maxStock: 20, reorderPoint: 3 })).toMatch(/reorden/);
    expect(validateLevels({ minStock: 5, maxStock: 4, reorderPoint: null })).toMatch(/máximo/);
    expect(validateLevels({ minStock: -1, maxStock: null, reorderPoint: null })).toMatch(/enteros/);
  });
});
