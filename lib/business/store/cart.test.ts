import { describe, expect, it } from "vitest";
import { ABANDON_AFTER_MINUTES, isAbandoned, normalizeCart, orderCode, orderMessage, validateCustomer } from "./cart";

const ok = { name: "María Pérez", phone: "300 123 4567", email: "maria@correo.com", address: "Calle 1 # 2-3", city: "Bogotá", notes: "" };

describe("tienda en línea", () => {
  it("valida los datos del cliente campo por campo", () => {
    expect(validateCustomer(ok)).toEqual({});
    expect(validateCustomer({ ...ok, name: "Ma", phone: "123", email: "malo" })).toEqual({ name: expect.any(String), phone: expect.stringContaining("10 dígitos"), email: expect.stringContaining("correo") });
    expect(validateCustomer({ ...ok, email: "" })).toEqual({}); // el correo es opcional
    expect(validateCustomer({ ...ok, notes: "x".repeat(301) }).notes).toBeDefined();
  });
  it("une productos repetidos y rechaza carritos inválidos", () => {
    expect(normalizeCart([{ productId: "a", quantity: 1 }, { productId: "b", quantity: 2 }, { productId: "a", quantity: 3 }])).toEqual({ ok: true, lines: [{ productId: "a", quantity: 4 }, { productId: "b", quantity: 2 }] });
    expect(normalizeCart([])).toMatchObject({ ok: false });
    expect(normalizeCart([{ productId: "a", quantity: 0 }])).toMatchObject({ ok: false });
    expect(normalizeCart([{ productId: "a", quantity: 1.5 }])).toMatchObject({ ok: false });
    expect(normalizeCart([{ productId: "a", quantity: 60 }, { productId: "a", quantity: 60 }])).toMatchObject({ ok: false });
    expect(normalizeCart(Array.from({ length: 41 }, (_, i) => ({ productId: `p${i}`, quantity: 1 })))).toMatchObject({ ok: false });
  });
  it("código y abandono", () => {
    expect(orderCode(7)).toBe("T-0007");
    const t = Date.parse("2026-10-24T10:00:00Z");
    expect(isAbandoned(t, t + (ABANDON_AFTER_MINUTES - 1) * 60_000)).toBe(false);
    expect(isAbandoned(t, t + ABANDON_AFTER_MINUTES * 60_000)).toBe(true);
  });
  it("el mensaje de WhatsApp trae pedido, total, nombre, entrega y enlace", () => {
    const m = orderMessage({ code: "T-0007", business: "Simplapp", lines: [{ name: "Plan mensual", quantity: 2, unitPrice: 120_000 }], total: 240_000, customer: { name: "María Pérez", address: "Calle 1", city: "Bogotá" }, payUrl: "https://x.co/pay/abc" });
    expect(m).toContain("T-0007");
    expect(m).toContain("2 × Plan mensual");
    expect(m).toContain("Total:");
    expect(m).toContain("Entrega: Calle 1, Bogotá");
    expect(m).toContain("https://x.co/pay/abc");
  });
});
