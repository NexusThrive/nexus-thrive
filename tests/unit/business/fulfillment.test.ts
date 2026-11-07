import { describe, expect, it } from "vitest";
import { FULFILLMENT_STATES, FULFILLMENT_TEXT, allowedNext, canAdvance, isFinal, transitionProblem } from "@/lib/business/store/fulfillment";

describe("cumplimiento del pedido (HU-pedidos-01)", () => {
  it("el camino feliz va de recibido a entregado", () => {
    const path = ["RECEIVED", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"] as const;
    for (let i = 0; i < path.length - 1; i++) expect(canAdvance(path[i]!, path[i + 1]!), `${path[i]} → ${path[i + 1]}`).toBe(true);
  });
  it("un pedido sin producción pasa de confirmado a listo y uno para recoger, de listo a entregado", () => {
    expect(canAdvance("CONFIRMED", "READY")).toBe(true);
    expect(canAdvance("READY", "DELIVERED")).toBe(true);
  });
  it("una transición inválida se rechaza con el motivo y las opciones", () => {
    expect(canAdvance("RECEIVED", "DELIVERED")).toBe(false);
    expect(canAdvance("SHIPPED", "READY")).toBe(false);
    expect(transitionProblem("RECEIVED", "DELIVERED")).toContain("No se puede pasar de «Recibido» a «Entregado»");
    expect(transitionProblem("RECEIVED", "DELIVERED")).toContain("Confirmado, Cancelado");
    expect(transitionProblem("RECEIVED", "CONFIRMED")).toBeNull();
    expect(transitionProblem("CONFIRMED", "CONFIRMED")).toContain("ya está");
  });
  it("entregado y cancelado son finales", () => {
    for (const s of ["DELIVERED", "CANCELED"]) {
      expect(isFinal(s)).toBe(true);
      expect(allowedNext(s)).toEqual([]);
      expect(transitionProblem(s, "CONFIRMED")).toContain("ya no cambia");
    }
    expect(isFinal("READY")).toBe(false);
  });
  it("un estado desconocido nunca avanza", () => {
    expect(allowedNext("INVENTADO")).toEqual([]);
    expect(transitionProblem("RECEIVED", "INVENTADO")).toBe("Ese estado no existe.");
    expect(transitionProblem("INVENTADO", "CONFIRMED")).toContain("desconocido");
  });
  it("todo estado tiene su texto y desde todo estado no final se puede cancelar salvo enviado", () => {
    for (const s of FULFILLMENT_STATES) expect(FULFILLMENT_TEXT[s]).toBeTruthy();
    for (const s of ["RECEIVED", "CONFIRMED", "IN_PRODUCTION", "READY"] as const) expect(canAdvance(s, "CANCELED")).toBe(true);
    expect(canAdvance("SHIPPED", "CANCELED")).toBe(false);
  });
});
