import { describe, expect, it } from "vitest";
import { DEFAULT_METHODS, offeredMethods, validateMethod } from "@/lib/business/sales/payment-methods";

describe("medios de pago del negocio", () => {
  it("un negocio sin configurar ofrece Efectivo y Transferencia", () => {
    expect(DEFAULT_METHODS.map((m) => m.kind)).toEqual(["CASH", "TRANSFER"]);
  });
  it("valida nombre, tipo y repetidos sin distinguir mayúsculas", () => {
    const others = [{ id: "a", name: "Nequi" }];
    expect(validateMethod({ kind: "TRANSFER", name: "  " }, others)).toMatchObject({ ok: false });
    expect(validateMethod({ kind: "TARJETA", name: "Datáfono" }, others)).toMatchObject({ ok: false });
    expect(validateMethod({ kind: "TRANSFER", name: "nequi" }, others)).toMatchObject({ ok: false, message: expect.stringContaining("Ya tienes") });
    expect(validateMethod({ kind: "TRANSFER", name: "nequi" }, others, "a")).toMatchObject({ ok: true });
    expect(validateMethod({ kind: "TRANSFER", name: " Daviplata   3001 ", instructions: " Cel 300 " }, others)).toEqual({ ok: true, value: { kind: "TRANSFER", name: "Daviplata 3001", instructions: "Cel 300" } });
  });
  it("ofrece solo los activos, en su orden", () => {
    const m = (id: string, active: boolean, position: number) => ({ id, kind: "CASH" as const, name: id, instructions: null, active, position });
    expect(offeredMethods([m("b", true, 2), m("a", true, 0), m("c", false, 1)]).map((x) => x.id)).toEqual(["a", "b"]);
  });
});
