import { describe, expect, it } from "vitest";
import { DEFAULT_LIMITS, canTransitionOrder, resolveLimits, validateAmount, validateQuantity } from "@/lib/foundation/kernel/integrity";

describe("integridad: montos y cantidades (HU-integridad-01)", () => {
  it("rechaza montos inválidos, negativos o sobre el tope", () => {
    expect(validateAmount(25_000)).toBeNull();
    expect(validateAmount(0)).toBeNull();
    expect(validateAmount(-1)).toContain("negativo");
    expect(validateAmount(Number.NaN)).toContain("no es válido");
    expect(validateAmount(Number.POSITIVE_INFINITY)).toContain("no es válido");
    expect(validateAmount(DEFAULT_LIMITS.maxAmount + 1)).toContain("máximo permitido");
    expect(validateAmount(DEFAULT_LIMITS.maxAmount)).toBeNull();
  });
  it("rechaza cantidades no enteras, negativas, cero o sobre el tope", () => {
    expect(validateQuantity(3)).toBeNull();
    for (const q of [0, -2, 1.5, Number.NaN]) expect(validateQuantity(q)).toContain("entero mayor que cero");
    expect(validateQuantity(DEFAULT_LIMITS.maxQuantity + 1)).toContain("máximo permitido");
  });
  it("cada negocio puede subir su tope, pero nunca pasar el absoluto", () => {
    expect(resolveLimits(null)).toEqual(DEFAULT_LIMITS);
    expect(resolveLimits({ limits: { maxAmount: 200_000_000 } }).maxAmount).toBe(200_000_000);
    expect(resolveLimits({ limits: { maxAmount: 1e15 } }).maxAmount).toBe(10_000_000_000);
    expect(resolveLimits({ limits: { maxAmount: -5, maxQuantity: "x" } })).toEqual(DEFAULT_LIMITS);
    expect(validateAmount(120_000_000, resolveLimits({ limits: { maxAmount: 200_000_000 } }))).toBeNull();
  });
  it("un pedido pagado o cancelado no se reabre; uno pendiente sí avanza", () => {
    expect(canTransitionOrder("PENDING_PAYMENT", "PAID")).toBe(true);
    expect(canTransitionOrder("PENDING_PAYMENT", "CANCELED")).toBe(true);
    expect(canTransitionOrder("ABANDONED", "PAID")).toBe(true);
    expect(canTransitionOrder("PAID", "CANCELED")).toBe(false);
    expect(canTransitionOrder("CANCELED", "PAID")).toBe(false);
    expect(canTransitionOrder("INVENTADO", "PAID")).toBe(false);
  });
});
