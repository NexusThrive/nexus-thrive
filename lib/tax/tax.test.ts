import { describe, expect, it } from "vitest";
import { documentTotals, lineAmounts } from "@/lib/business/commercial-document";
import { computeWithholdings, fiscalCode, isInForce, netPayable, overlaps, rateInForce, resolutionStatus, taxBreakdown, validateResolution, validateTaxRate, warnThreshold } from "./tax";

const rate = (o: Partial<Parameters<typeof isInForce>[0]> & { code?: string }) => ({ code: "IVA_19", active: true, validFrom: "2023-01-01", validTo: null, ...o });

describe("vigencia de tarifas", () => {
  it("rige entre sus fechas, inclusive, y solo si está activa", () => {
    const r = rate({ validFrom: "2026-01-01", validTo: "2026-12-31" });
    expect(isInForce(r, "2026-01-01")).toBe(true);
    expect(isInForce(r, "2026-12-31")).toBe(true);
    expect(isInForce(r, "2025-12-31")).toBe(false);
    expect(isInForce(r, "2027-01-01")).toBe(false);
    expect(isInForce({ ...r, active: false }, "2026-06-01")).toBe(false);
    expect(isInForce(rate({}), "2099-01-01")).toBe(true);
  });
  it("elige la vigente del código en esa fecha", () => {
    const rates = [rate({ code: "IVA_X", validFrom: "2020-01-01", validTo: "2022-12-31", id: "a" } as never), rate({ code: "IVA_X", validFrom: "2023-01-01", id: "b" } as never), rate({ code: "OTRO", id: "c" } as never)];
    expect((rateInForce(rates, "IVA_X", "2021-05-05") as unknown as { id: string }).id).toBe("a");
    expect((rateInForce(rates, "IVA_X", "2024-05-05") as unknown as { id: string }).id).toBe("b");
    expect(rateInForce(rates, "NO_EXISTE", "2024-05-05")).toBeNull();
  });
  it("detecta vigencias que se pisan", () => {
    expect(overlaps({ validFrom: "2020-01-01", validTo: "2022-12-31" }, { validFrom: "2023-01-01", validTo: null })).toBe(false);
    expect(overlaps({ validFrom: "2020-01-01", validTo: "2023-01-01" }, { validFrom: "2023-01-01", validTo: null })).toBe(true);
    expect(overlaps({ validFrom: "2020-01-01", validTo: null }, { validFrom: "2030-01-01", validTo: null })).toBe(true);
  });
  it("valida la tarifa", () => {
    const ok = { code: "IVA_19", name: "IVA 19 %", kind: "IVA", ratePct: 19, minBase: 0, validFrom: "2023-01-01", validTo: null };
    expect(validateTaxRate(ok)).toBeNull();
    expect(validateTaxRate({ ...ok, code: "iva 19" })).toContain("código");
    expect(validateTaxRate({ ...ok, ratePct: 120 })).toContain("0 %");
    expect(validateTaxRate({ ...ok, kind: "OTRO" })).toContain("tipo");
    expect(validateTaxRate({ ...ok, validTo: "2022-01-01" })).toContain("después");
  });
});

describe("venta con IVA 19 %, IVA 5 % y retenciones (caso de contador)", () => {
  // Servicio de 1 000 000 al 19 % + producto de 400 000 con 10 % de descuento al 5 %.
  const lines = [
    { description: "Asesoría", quantity: 1, unitPrice: 1_000_000, taxRatePct: 19 },
    { description: "Insumo", quantity: 2, unitPrice: 200_000, discountPct: 10, taxRatePct: 5 },
  ];
  const parts = lines.map(lineAmounts);
  it("totales por tarifa", () => {
    expect(documentTotals(lines)).toEqual({ subtotal: 1_400_000, discountTotal: 40_000, taxTotal: 208_000, total: 1_568_000 });
    expect(taxBreakdown(parts.map((p, i) => ({ taxable: p.taxable, taxRatePct: lines[i]!.taxRatePct, tax: p.tax })))).toEqual([
      { ratePct: 19, base: 1_000_000, tax: 190_000 },
      { ratePct: 5, base: 360_000, tax: 18_000 },
    ]);
  });
  const taxable = 1_360_000;
  const tax = 208_000;
  const rates = [
    { code: "RETEFUENTE_SERVICIOS", name: "Retefuente servicios", kind: "RETEFUENTE" as const, ratePct: 4, minBase: 0 },
    { code: "RETEIVA", name: "ReteIVA", kind: "RETEIVA" as const, ratePct: 15, minBase: 0 },
    { code: "IVA_19", name: "IVA", kind: "IVA" as const, ratePct: 19, minBase: 0 },
  ];
  it("retefuente sobre la base sin IVA y reteIVA sobre el IVA; el IVA no es retención", () => {
    const w = computeWithholdings({ taxable, tax }, rates);
    expect(w.map((x) => [x.code, x.base, x.amount])).toEqual([["RETEFUENTE_SERVICIOS", 1_360_000, 54_400], ["RETEIVA", 208_000, 31_200]]);
    expect(netPayable(1_568_000, w)).toBe(1_482_400);
  });
  it("no practica la retención si la base no llega al mínimo", () => {
    expect(computeWithholdings({ taxable: 100_000, tax: 19_000 }, [{ code: "R", name: "R", kind: "RETEFUENTE", ratePct: 4, minBase: 500_000 }])).toEqual([]);
    expect(computeWithholdings({ taxable: 0, tax: 0 }, rates)).toEqual([]);
  });
});

describe("resoluciones de numeración", () => {
  const base = { prefix: "SETP", rangeFrom: 1, rangeTo: 1000, nextNumber: 1, validFrom: "2026-01-01", validTo: "2027-01-01", active: true };
  it("está bien y no avisa al inicio", () => {
    expect(resolutionStatus(base, "2026-06-01")).toMatchObject({ state: "ok", remaining: 1000, warnings: [] });
  });
  it("avisa cuando quedan pocos números o poca vigencia", () => {
    expect(warnThreshold(base)).toBe(100);
    expect(resolutionStatus({ ...base, nextNumber: 901 }, "2026-06-01")).toMatchObject({ state: "ok", remaining: 100, warnings: ["Quedan 100 números del rango."] });
    expect(resolutionStatus(base, "2026-12-15").warnings).toEqual(["La resolución vence en 17 días."]);
    expect(resolutionStatus(base, "2027-01-01").warnings).toEqual(["La resolución vence hoy."]);
    expect(warnThreshold({ rangeFrom: 1, rangeTo: 50 })).toBe(20);
  });
  it("bloquea fuera del rango o de la vigencia", () => {
    expect(resolutionStatus({ ...base, nextNumber: 1001 }, "2026-06-01")).toMatchObject({ state: "exhausted", remaining: 0 });
    expect(resolutionStatus(base, "2027-01-02")).toMatchObject({ state: "expired" });
    expect(resolutionStatus(base, "2025-12-31")).toMatchObject({ state: "not_started" });
    expect(resolutionStatus({ ...base, active: false }, "2026-06-01")).toMatchObject({ state: "inactive" });
  });
  it("valida la resolución y arma el código", () => {
    const ok = { documentKind: "SALE", prefix: "SETP", resolutionNumber: "18760000001", rangeFrom: 1, rangeTo: 100, validFrom: "2026-01-01", validTo: "2027-01-01" };
    expect(validateResolution(ok, ["SALE"])).toBeNull();
    expect(validateResolution({ ...ok, documentKind: "QUOTE" }, ["SALE"])).toContain("tipo");
    expect(validateResolution({ ...ok, rangeTo: 0 }, ["SALE"])).toContain("final");
    expect(validateResolution({ ...ok, prefix: "MUY-LARGO" }, ["SALE"])).toContain("prefijo");
    expect(fiscalCode("SETP", 990000123)).toBe("SETP990000123");
  });
});
