import { describe, expect, it } from "vitest";
import { balanceDueOnDelivery, dispatchProblems } from "@/lib/business/store/delivery";

describe("entregas (HU-entregas-01)", () => {
  it("la transportadora exige empresa y guía", () => {
    expect(dispatchProblems({ method: "COURIER" })).toMatchObject({ carrier: expect.any(String), trackingCode: expect.any(String) });
    expect(dispatchProblems({ method: "COURIER", carrier: "Servientrega", trackingCode: "123" })).toEqual({});
  });
  it("reparto propio no pide guía y recoger en el negocio no se despacha", () => {
    expect(dispatchProblems({ method: "OWN" })).toEqual({});
    expect(dispatchProblems({ method: "PICKUP" }).method).toContain("no se envía");
    expect(dispatchProblems({ method: "X" }).method).toBeTruthy();
  });
  it("la fecha debe ser AAAA-MM-DD", () => {
    expect(dispatchProblems({ method: "OWN", scheduledFor: "12/11/2026" }).scheduledFor).toBeTruthy();
    expect(dispatchProblems({ method: "OWN", scheduledFor: "2026-11-12" })).toEqual({});
  });
  it("el saldo al entregar es el total si no está pagado", () => {
    expect(balanceDueOnDelivery("PAID", 100)).toBe(0);
    expect(balanceDueOnDelivery("PENDING_PAYMENT", 100)).toBe(100);
  });
});
