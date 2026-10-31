import { describe, expect, test } from "vitest";
import { canCancel, canClose, canMarkOrdered, canReceive, nextStatus, orderCode, orderTotals, validateLines } from "./purchases";

describe("compras (puro)", () => {
  test("consecutivo legible", () => {
    expect(orderCode(7)).toBe("OC-0007");
    expect(orderCode(12345)).toBe("OC-12345");
  });
  test("totales: subtotal sin impuesto, impuesto por línea y total", () => {
    expect(orderTotals([{ quantity: 10, unitCost: 1000, taxRatePct: 19 }, { quantity: 2, unitCost: 500.5, taxRatePct: 0 }])).toEqual({ subtotal: 11001, taxTotal: 1900, total: 12901 });
    expect(orderTotals([])).toEqual({ subtotal: 0, taxTotal: 0, total: 0 });
  });
  test("estados permitidos", () => {
    expect(canReceive("DRAFT") && canReceive("ORDERED") && canReceive("PARTIAL")).toBe(true);
    expect(canReceive("RECEIVED") || canReceive("CANCELED")).toBe(false);
    expect(canCancel("ORDERED", 0)).toBe(true);
    expect(canCancel("ORDERED", 3)).toBe(false); // ya llegó algo
    expect(canCancel("PARTIAL", 0)).toBe(false);
    expect(canMarkOrdered("DRAFT")).toBe(true);
    expect(canMarkOrdered("ORDERED")).toBe(false);
    expect(canClose("PARTIAL")).toBe(true);
    expect(canClose("DRAFT")).toBe(false);
  });
  test("el estado sale de lo recibido", () => {
    expect(nextStatus([{ quantity: 5, receivedQuantity: 5 }, { quantity: 2, receivedQuantity: 2 }])).toBe("RECEIVED");
    expect(nextStatus([{ quantity: 5, receivedQuantity: 5 }, { quantity: 2, receivedQuantity: 1 }])).toBe("PARTIAL");
  });
  test("validación de líneas", () => {
    const ok = { productId: "p", quantity: 1, unitCost: 10, taxRatePct: 19 };
    expect(validateLines([ok])).toBeNull();
    expect(validateLines([])).toMatch(/al menos/);
    expect(validateLines([{ ...ok, productId: "" }])).toMatch(/Línea 1/);
    expect(validateLines([{ ...ok, quantity: 0 }])).toMatch(/cantidad/);
    expect(validateLines([{ ...ok, quantity: 1.5 }])).toMatch(/cantidad/);
    expect(validateLines([{ ...ok, unitCost: -1 }])).toMatch(/costo/);
    expect(validateLines([{ ...ok, taxRatePct: 101 }])).toMatch(/impuesto/);
  });
});
