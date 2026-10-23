import { describe, expect, it } from "vitest";
import { applyKey } from "./keypad";

describe("applyKey", () => {
  it("escribe, agrega miles y borra", () => {
    expect(applyKey(0, "4")).toBe(4);
    expect(applyKey(45, "000")).toBe(45000);
    expect(applyKey(45000, "back")).toBe(4500);
  });
  it("no pasa del tope", () => {
    expect(applyKey(99_999_999, "9")).toBe(99_999_999);
  });
});
