import { describe, expect, test } from "vitest";
import { copAmountExceeds, parseCopAmount } from "./cop-amount";

describe("parseCopAmount", () => {
  test.each([
    ["150000", "150000"],
    ["150.000", "150000"],
    ["150,000", "150000"],
    ["1.234.567", "1234567"],
    ["1.234.567,89", "1234567.89"],
    ["1,234,567.89", "1234567.89"],
    ["150000,5", "150000.5"],
    ["150000.50", "150000.5"],
    ["$ 150.000", "150000"],
    ["  2 500  ", "2500"],
    ["007", "7"],
    ["0,5", "0.5"],
  ])("%j → %j", (raw, expected) => {
    expect(parseCopAmount(raw)).toBe(expected);
  });

  test.each([
    "",
    "   ",
    "0",
    "0,00",
    "-5000",
    "abc",
    "1.2.3",
    "1.234,567",
    "1,234.567",
    "1.234,5,6",
    "12.34.567",
    "150,000,00",
    "1e6",
  ])("rechaza %j", (raw) => {
    expect(parseCopAmount(raw)).toBeNull();
  });

  // Regresión: antes "150.000" se guardaba como 150 (Number("150.000")).
  test("los miles con punto no se confunden con decimales", () => {
    expect(parseCopAmount("150.000")).not.toBe("150");
  });
});

describe("copAmountExceeds", () => {
  const MAX = BigInt(100_000_000);

  test("respeta el tope exacto", () => {
    expect(copAmountExceeds("100000000", MAX)).toBe(false);
    expect(copAmountExceeds("99999999.99", MAX)).toBe(false);
  });

  test("detecta montos por encima del tope", () => {
    expect(copAmountExceeds("100000000.01", MAX)).toBe(true);
    expect(copAmountExceeds("100000001", MAX)).toBe(true);
    expect(copAmountExceeds("999999999999999999999", MAX)).toBe(true);
  });
});
