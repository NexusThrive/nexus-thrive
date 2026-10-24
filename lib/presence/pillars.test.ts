import { describe, expect, it } from "vitest";
import { PILLAR_WEIGHTS, computePillars, phaseA, trendOf } from "./pillars";
import { computePresence } from "./presence";

const full = computePresence({ name: "Simplapp", address: "Calle 1", whatsappNumber: "3001234567", latitude: 4, longitude: -74, googleBusinessUrl: "https://g.page/x", instagramHandle: "@s", catalogItems: 5, websiteUrl: "https://x.co", website: { url: "https://x.co", reachable: true, https: true, statusCode: 200, title: "T", description: "D", viewport: true } });
const empty = computePresence({});

describe("pilares de presencia (fase A)", () => {
  it("los pesos suman 100", () => {
    expect(Object.values(PILLAR_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("sitio y datos básicos salen del puntaje verificado; reputación y atribución sin medir no se inventan", () => {
    const p = computePillars({ presence: full, onlineProducts: 0, gatewayConnected: false, paidOnlineLast90d: 0 });
    const by = Object.fromEntries(p.map((x) => [x.key, x.score]));
    expect(by).toEqual({ site: 100, onlineSales: 0, reputation: null, attribution: null, basics: 100 });
    const a = phaseA(p);
    // medidos: sitio 30·100 + venta 30·0 + básicos 10·100 sobre 70 → 57; cobertura 70 %
    expect(a).toMatchObject({ score: 57, coverage: 70, measured: 3, phase: "A" });
  });
  it("venta en línea suma por productos publicados, pasarela y primer cobro", () => {
    const sc = (o: Partial<Parameters<typeof computePillars>[0]>) => computePillars({ presence: empty, onlineProducts: 0, gatewayConnected: false, paidOnlineLast90d: 0, ...o }).find((p) => p.key === "onlineSales")!.score;
    expect(sc({})).toBe(0);
    expect(sc({ onlineProducts: 3 })).toBe(40);
    expect(sc({ onlineProducts: 3, gatewayConnected: true })).toBe(70);
    expect(sc({ onlineProducts: 3, gatewayConnected: true, paidOnlineLast90d: 2 })).toBe(100);
  });
  it("reputación y atribución se miden cuando hay datos", () => {
    const p = computePillars({ presence: full, onlineProducts: 2, gatewayConnected: true, paidOnlineLast90d: 1, reputation: { reviews: 20, average: 4.6 }, attribution: { withOrigin: 9, total: 10 } });
    expect(p.find((x) => x.key === "reputation")!.score).toBe(92);
    expect(p.find((x) => x.key === "attribution")!.score).toBe(90);
    expect(phaseA(p)).toMatchObject({ coverage: 100, phase: "B_READY" });
  });
  it("con pocas reseñas la reputación pesa menos (no basta una de 5 estrellas)", () => {
    const p = computePillars({ presence: empty, onlineProducts: 0, gatewayConnected: false, paidOnlineLast90d: 0, reputation: { reviews: 1, average: 5 } });
    expect(p.find((x) => x.key === "reputation")!.score).toBe(10);
  });
  it("la fase B no abre si algún pilar está bajo aunque todo se mida", () => {
    const p = computePillars({ presence: full, onlineProducts: 2, gatewayConnected: true, paidOnlineLast90d: 0, reputation: { reviews: 20, average: 4.6 }, attribution: { withOrigin: 9, total: 10 } });
    expect(phaseA(p).phase).toBe("A"); // venta en línea 70 < 80
  });
});

describe("tendencia", () => {
  it("sube, baja o se mantiene contra la foto de hace ~30 días", () => {
    const s = (pairs: [string, number][]) => pairs.map(([day, score]) => ({ day, score }));
    expect(trendOf(s([["2026-09-24", 40], ["2026-10-10", 50], ["2026-10-24", 58]]), "2026-10-24")).toMatchObject({ direction: "up", delta: 18, days: 30 });
    expect(trendOf(s([["2026-09-24", 60], ["2026-10-24", 52]]), "2026-10-24")).toMatchObject({ direction: "down", delta: -8 });
    expect(trendOf(s([["2026-09-24", 60], ["2026-10-24", 61]]), "2026-10-24").direction).toBe("flat");
    expect(trendOf(s([["2026-10-24", 61]]), "2026-10-24")).toMatchObject({ direction: "flat", delta: 0, days: 0 });
    expect(trendOf([], "2026-10-24").series).toEqual([]);
  });
});
