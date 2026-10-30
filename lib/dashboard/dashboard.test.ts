import { describe, expect, it } from "vitest";
import { greetingFor, percentChange, previousBogotaMonth } from ".";

describe("previousBogotaMonth", () => {
  it("enero vuelve a diciembre del año anterior", () => {
    expect(previousBogotaMonth(new Date("2026-01-15T17:00:00Z"))).toEqual({ month: 12, year: 2025 });
  });
  it("usa la fecha de Bogotá, no la UTC", () => {
    // 1 de nov 03:00 UTC = 31 de oct 22:00 en Bogotá → mes anterior septiembre.
    expect(previousBogotaMonth(new Date("2026-11-01T03:00:00Z"))).toEqual({ month: 9, year: 2026 });
  });
});

describe("percentChange", () => {
  it("sin base no hay variación", () => expect(percentChange(10, 0)).toBeNull());
  it("redondea", () => expect(percentChange(112, 100)).toBe(12));
  it("con base negativa compara contra el valor absoluto", () => expect(percentChange(-50, -100)).toBe(50));
});

describe("greetingFor", () => {
  it("en hora de Bogotá", () => {
    expect(greetingFor(new Date("2026-10-16T14:00:00Z"))).toBe("Buenos días"); // 9:00
    expect(greetingFor(new Date("2026-10-16T20:00:00Z"))).toBe("Buenas tardes"); // 15:00
    expect(greetingFor(new Date("2026-10-17T02:00:00Z"))).toBe("Buenas noches"); // 21:00
  });
});

describe("insights del inicio", () => {
  it("comparison: con base devuelve la variación y su nota", async () => {
    const { comparison } = await import("./insights");
    expect(comparison(112, 100, "vs. periodo anterior")).toEqual({ change: 12, note: "vs. periodo anterior" });
  });
  it("comparison: sin base no inventa un 0 %", async () => {
    const { comparison } = await import("./insights");
    expect(comparison(50, 0, "vs. ayer")).toEqual({ change: null, note: "Sin variación disponible" });
  });
  it("cashFlow resta gastos de ingresos", async () => {
    const { cashFlow } = await import("./insights");
    expect(cashFlow(1000, 250)).toBe(750);
    expect(cashFlow(0, 60)).toBe(-60);
  });
  it("countLabel singular, plural y vacío", async () => {
    const { countLabel } = await import("./insights");
    expect(countLabel(1, "cobro registrado", "cobros registrados")).toBe("1 cobro registrado");
    expect(countLabel(6, "cobro registrado", "cobros registrados")).toBe("6 cobros registrados");
    expect(countLabel(0, "cobro", "cobros")).toBe("Sin movimientos");
  });
  it("updatedLabel usa la hora de Bogotá", async () => {
    const { updatedLabel } = await import("./insights");
    expect(updatedLabel(new Date("2026-10-16T20:42:00Z"))).toMatch(/^Actualizado a las 3:42/);
  });
});

describe("daysUntil", () => {
  it("redondea hacia arriba y no baja de 0", async () => {
    const { daysUntil } = await import("./insights");
    const now = new Date("2026-10-16T12:00:00Z");
    expect(daysUntil("2026-10-18T10:00:00Z", now)).toBe(2);
    expect(daysUntil("2026-10-16T18:00:00Z", now)).toBe(1);
    expect(daysUntil("2026-10-10T00:00:00Z", now)).toBe(0);
  });
});
