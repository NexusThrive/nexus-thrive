import { describe, expect, it } from "vitest";
import { computeMaturity } from "./maturity";
import { isoWeek, phaseChangeNotice, weeklyReport } from "./notices";
import type { Pillar, Trend } from "./pillars";

const P = (key: Pillar["key"], label: string, score: number | null): Pillar => ({ key, label, weight: 10, score, verified: true, hint: `pista ${label}` });
const flat: Trend = { direction: "flat", delta: 0, days: 0, series: [] };

describe("cambio de fase", () => {
  it("avisa solo cuando cambia y hay un antes", () => {
    expect(phaseChangeNotice(null, "A")).toBeNull();
    expect(phaseChangeNotice("A", "A")).toBeNull();
    expect(phaseChangeNotice("A", "B_READY")!.title).toContain("fase B");
    expect(phaseChangeNotice("B_READY", "A")!.title).toContain("salió");
  });
});

describe("semana ISO", () => {
  it("calcula la semana, incluido el borde de año", () => {
    expect(isoWeek("2026-10-24")).toBe("2026-W43");
    expect(isoWeek("2026-10-26")).toBe("2026-W44"); // lunes
    expect(isoWeek("2027-01-01")).toBe("2026-W53");
    expect(isoWeek("2024-12-30")).toBe("2025-W01");
  });
});

describe("reporte semanal", () => {
  const m = computeMaturity({ invoices30d: 0, productsActive: 0, stockMovements30d: 0, cashSessions30d: 0, customers: 0, customersWithPurchase30d: 0, expenses30d: 0 });
  it("nombra los dos pilares más débiles, lo que falta medir y las acciones", () => {
    const r = weeklyReport({ day: "2026-10-24", score: 62, coverage: 75, pillars: [P("site", "Sitio", 90), P("google", "Google", 40), P("onlineSales", "Venta en línea", 30), P("reputation", "Reputación", null)], trend: { direction: "up", delta: 8, days: 30, series: [] }, maturity: m });
    expect(r.weakest.map((w) => w.label)).toEqual(["Venta en línea", "Google"]);
    expect(r.unmeasured).toEqual(["Reputación"]);
    expect(r.actions).toHaveLength(3);
    expect(r.text).toContain("Presencia 62/100");
    expect(r.text).toContain("Sube (+8 pts en 30 días)");
    expect(r.week).toBe("2026-W43");
  });
  it("sin nada débil ni por medir, no inventa tareas", () => {
    const r = weeklyReport({ day: "2026-10-24", score: 95, coverage: 100, pillars: [P("site", "Sitio", 95)], trend: flat, maturity: null });
    expect(r).toMatchObject({ weakest: [], unmeasured: [], actions: [], trend: "Aún sin comparación" });
  });
});
