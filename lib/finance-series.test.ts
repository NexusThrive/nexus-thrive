import { describe, expect, it } from "vitest";
import { bogotaDayKey, buildFinanceSeries, cumulativeByDay, lastBogotaDays, runningBalance } from "./finance-series";

// 16 oct 2026, 22:00 en Bogotá (03:00 UTC del 17).
const NOW = new Date("2026-10-17T03:00:00Z");

describe("bogotaDayKey", () => {
  it("usa el día de Bogotá, no el de UTC", () => {
    expect(bogotaDayKey(NOW)).toBe("2026-10-16");
  });
});

describe("lastBogotaDays", () => {
  it("termina hoy y va en orden", () => {
    expect(lastBogotaDays(3, NOW)).toEqual(["2026-10-14", "2026-10-15", "2026-10-16"]);
  });
});

describe("buildFinanceSeries", () => {
  const s = buildFinanceSeries(
    {
      days: 7,
      payments: [
        { amount: 100, at: "2026-10-16T20:00:00Z" },
        { amount: 50, at: "2026-10-10T15:00:00Z" },
        { amount: 70, at: "2026-10-05T15:00:00Z" }, // periodo anterior
        { amount: 999, at: "2026-09-01T15:00:00Z" }, // fuera
      ],
      expenses: [{ amount: 30, at: "2026-10-16T12:00:00Z" }],
    },
    NOW,
  );
  it("arma un día por posición y suma en su día", () => {
    expect(s.days).toHaveLength(7);
    expect(s.days.at(-1)).toEqual({ day: "2026-10-16", income: 100, expenses: 30 });
  });
  it("separa el periodo actual del anterior e ignora lo demás", () => {
    expect(s.current).toEqual({ income: 150, expenses: 30, balance: 120, count: 2 });
    expect(s.previous).toEqual({ income: 70, expenses: 0, balance: 70, count: 1 });
  });
  it("saldo acumulado", () => {
    expect(runningBalance(s.days).at(-1)).toBe(120);
  });
});

describe("hoy por hora", () => {
  const s = buildFinanceSeries(
    {
      days: 1,
      payments: [
        { amount: 10, at: "2026-10-16T15:30:00Z" }, // 10:30 Bogotá
        { amount: 5, at: "2026-10-16T09:00:00Z" }, // 04:00 → primera hora
      ],
      expenses: [{ amount: 3, at: "2026-10-17T02:30:00Z" }], // 21:30 → última
    },
    NOW,
  );
  it("agrupa por hora de Bogotá sin perder lo de fuera del rango", () => {
    expect(s.hours?.find((h) => h.hour === 10)?.income).toBe(10);
    expect(s.hours?.[0].income).toBe(5);
    expect(s.hours?.at(-1)?.expenses).toBe(3);
  });
});

describe("cumulativeByDay", () => {
  it("acumula altas desde la base", () => {
    const days = lastBogotaDays(3, NOW);
    expect(cumulativeByDay(4, ["2026-10-15T15:00:00Z", "2026-10-16T15:00:00Z"], days)).toEqual([4, 5, 6]);
  });
});
