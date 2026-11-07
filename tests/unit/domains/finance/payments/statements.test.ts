import { describe, expect, it } from "vitest";
import { parseStatement, parseStatementAmount, parseStatementDay, proposeMatches, statementFingerprint } from "@/lib/domains/finance/payments/statements";

describe("extracto bancario (HU-conciliacion-01)", () => {
  it("lee fechas en los formatos de los bancos y rechaza las inválidas", () => {
    expect(parseStatementDay("2026-11-07")).toBe("2026-11-07");
    expect(parseStatementDay("07/11/2026")).toBe("2026-11-07");
    expect(parseStatementDay("7-11-2026")).toBe("2026-11-07");
    expect(parseStatementDay("31/02/2026")).toBeNull();
    expect(parseStatementDay("hoy")).toBeNull();
  });
  it("lee valores con miles, decimales y signo", () => {
    expect(parseStatementAmount("$1.250.000,50")).toBe(1_250_000.5);
    expect(parseStatementAmount("139.050")).toBe(139_050);
    expect(parseStatementAmount("1,250,000.50")).toBe(1_250_000.5);
    expect(parseStatementAmount("-45.000")).toBe(-45_000);
    expect(parseStatementAmount("(45.000)")).toBe(-45_000);
    expect(parseStatementAmount("abc")).toBeNull();
  });
  it("lee el CSV con encabezado opcional y reporta las líneas ilegibles", () => {
    const r = parseStatement("fecha;descripcion;referencia;valor\n2026-11-07; Abono Wompi; LQ-114; 139.050\n06/11/2026;Transferencia;88231;140.000\nbasura\n05/11/2026;Nómina;;-900.000");
    expect(r.lines).toHaveLength(3);
    expect(r.lines[0]).toEqual({ day: "2026-11-07", description: "Abono Wompi", reference: "LQ-114", amount: 139_050 });
    expect(r.lines[2]).toMatchObject({ amount: -900_000, reference: null });
    expect(r.bad).toEqual([4]);
  });
  it("la huella no cambia entre importaciones y distingue movimientos", () => {
    const a = { day: "2026-11-07", description: "Abono Wompi", reference: "LQ-114", amount: 139_050 };
    expect(statementFingerprint(a)).toBe(statementFingerprint({ ...a }));
    expect(statementFingerprint(a)).not.toBe(statementFingerprint({ ...a, amount: 139_051 }));
  });
});

describe("propuesta de cruces", () => {
  const line = (key: string, day: string, amount: number) => ({ key, day, description: "x", reference: null, amount });
  const cands = [
    { type: "SETTLEMENT" as const, id: "s1", day: "2026-11-07", amount: 139_050 },
    { type: "PAYMENT" as const, id: "p1", day: "2026-11-06", amount: 140_000 },
    { type: "PAYMENT" as const, id: "p2", day: "2026-11-01", amount: 80_000 },
  ];
  it("cruce exacto, aproximado y sin cruce", () => {
    const out = proposeMatches([line("a", "2026-11-08", 139_050), line("b", "2026-11-06", 140_000), line("c", "2026-11-02", 80_500), line("d", "2026-11-03", 12_345)], cands);
    expect(out).toContainEqual({ lineKey: "a", type: "SETTLEMENT", id: "s1", confidence: "EXACT" });
    expect(out).toContainEqual({ lineKey: "b", type: "PAYMENT", id: "p1", confidence: "EXACT" });
    expect(out).toContainEqual({ lineKey: "c", type: "PAYMENT", id: "p2", confidence: "APPROX" });
    expect(out.find((p) => p.lineKey === "d")).toBeUndefined();
  });
  it("un candidato se usa una sola vez y el exacto gana al aproximado", () => {
    const out = proposeMatches([line("x", "2026-11-07", 139_500), line("y", "2026-11-07", 139_050)], cands);
    expect(out.filter((p) => p.id === "s1")).toHaveLength(1);
    expect(out.find((p) => p.id === "s1")).toMatchObject({ lineKey: "y", confidence: "EXACT" });
  });
  it("los retiros no se cruzan y un depósito lejano en el tiempo no cruza", () => {
    expect(proposeMatches([line("r", "2026-11-07", -139_050)], cands)).toEqual([]);
    expect(proposeMatches([line("l", "2026-12-20", 139_050)], cands)).toEqual([]);
  });
});
