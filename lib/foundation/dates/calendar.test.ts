import { describe, expect, it } from "vitest";
import { addDays, addMonths, dayTitle, monthGrid, weekDays, weekStart, weeksBetween } from "./calendar";

describe("calendario", () => {
  it("semana de lunes a domingo", () => {
    expect(weekStart("2026-10-16")).toBe("2026-10-12"); // viernes → lunes
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // domingo
    expect(weekDays("2026-10-16").at(-1)).toBe("2026-10-18");
  });
  it("cruza meses y años", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-01");
  });
  it("cuadrícula de 42 días desde el lunes", () => {
    const g = monthGrid("2026-10-16");
    expect(g).toHaveLength(42);
    expect(g[0]).toBe("2026-09-28");
    expect(g).toContain("2026-10-31");
  });
  it("títulos relativos", () => {
    expect(dayTitle("2026-10-16", "2026-10-16")).toBe("Hoy");
    expect(dayTitle("2026-10-17", "2026-10-16")).toBe("Mañana");
    expect(dayTitle("2026-10-20", "2026-10-16")).toBe("Martes, 20 de octubre");
  });
  it("semanas entre fechas", () => {
    expect(weeksBetween("2026-10-16", "2026-10-26")).toBe(2);
  });
});
