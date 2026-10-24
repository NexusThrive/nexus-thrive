import { describe, expect, it } from "vitest";
import { buildConsumption, consumptionRow, needsAttention } from "./consumption";

describe("consumo frente a límites", () => {
  it("sin límite no hay barra ni aviso", () => {
    expect(consumptionRow({ key: "a", label: "A", used: 500, limit: null })).toMatchObject({ status: "unlimited", pct: 0 });
  });
  it("avisa al 80 % y marca excedido al llegar al límite", () => {
    expect(consumptionRow({ key: "a", label: "A", used: 79, limit: 100 })).toMatchObject({ status: "ok", pct: 79 });
    expect(consumptionRow({ key: "a", label: "A", used: 80, limit: 100 })).toMatchObject({ status: "near", pct: 80 });
    expect(consumptionRow({ key: "a", label: "A", used: 100, limit: 100 })).toMatchObject({ status: "over", pct: 100 });
    expect(consumptionRow({ key: "a", label: "A", used: 130, limit: 100 })).toMatchObject({ status: "over", pct: 100 });
  });
  it("un límite de cero con uso está excedido; sin uso, bien", () => {
    expect(consumptionRow({ key: "a", label: "A", used: 1, limit: 0 }).status).toBe("over");
    expect(consumptionRow({ key: "a", label: "A", used: 0, limit: 0 }).status).toBe("ok");
  });
  it("arma equipo, clientes y medidores, y destaca lo que requiere atención", () => {
    const rows = buildConsumption({
      seats: { used: 4, limit: 5 },
      customers: { used: 20, limit: null },
      meters: [{ meter: "api.requests", label: "Peticiones a la API", used: 100, limit: 50_000, period: "2026-10" }],
    });
    expect(rows.map((r) => r.key)).toEqual(["seats", "customers", "api.requests"]);
    expect(needsAttention(rows).map((r) => r.key)).toEqual(["seats"]);
  });
});
