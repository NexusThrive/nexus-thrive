import { describe, expect, it } from "vitest";
import { byUrgency, isOverdue, validateLoss, validateOpportunity } from "@/lib/business/growth/opportunities";

describe("oportunidades (HU-leads-01)", () => {
  it("exige qué le interesa a la persona y un valor razonable", () => {
    expect(validateOpportunity({ interest: "40 camisetas", estimatedValue: 1_600_000 })).toBeNull();
    expect(validateOpportunity({ interest: "ab" })).toContain("interesa");
    expect(validateOpportunity({ interest: "x".repeat(201) })).toContain("largo");
    expect(validateOpportunity({ interest: "Gorras", estimatedValue: -5 })).toContain("valor");
    expect(validateOpportunity({ interest: "Gorras", estimatedValue: Number.NaN })).toContain("valor");
  });
  it("perder exige el motivo", () => {
    expect(validateLoss("Compró en otro lado")).toBeNull();
    expect(validateLoss(" ")).toContain("por qué");
  });
  it("la acción vencida va primero, luego la más cercana y al final la que no tiene fecha", () => {
    const now = Date.parse("2026-11-07T12:00:00Z");
    const rows = [
      { id: "sin", nextActionAt: null, createdAt: "2026-11-05" },
      { id: "futura", nextActionAt: "2026-11-20T12:00:00Z", createdAt: "2026-11-01" },
      { id: "vencida", nextActionAt: "2026-11-01T12:00:00Z", createdAt: "2026-10-30" },
    ];
    expect(byUrgency(rows, now).map((r) => r.id)).toEqual(["vencida", "futura", "sin"]);
    expect(isOverdue("2026-11-01T12:00:00Z", now)).toBe(true);
    expect(isOverdue("2026-11-20T12:00:00Z", now)).toBe(false);
    expect(isOverdue(null, now)).toBe(false);
  });
});
