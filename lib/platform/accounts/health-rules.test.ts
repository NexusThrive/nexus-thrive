import { describe, expect, it } from "vitest";
import { healthScore } from "./health-rules";

const good = { daysSinceActivity: 1, onboardingPct: 100, hasSubscription: true, billing: "ok" as const, serviceSuspended: false, openTickets: 0, breachedTickets: 0, scores: [5, 5] };

describe("salud de cuenta", () => {
  it("una cuenta activa, al día y contenta es saludable con 100", () => {
    const h = healthScore(good);
    expect(h.score).toBe(100);
    expect(h.level).toBe("healthy");
    expect(h.nextAction).toBeNull();
  });
  it("explica cada factor y sugiere la acción de mayor impacto", () => {
    const h = healthScore({ ...good, daysSinceActivity: 40, billing: "suspendable", breachedTickets: 1 });
    expect(h.factors.find((f) => f.key === "pagos")?.points).toBe(0);
    expect(h.factors.find((f) => f.key === "actividad")?.reason).toContain("40 días");
    expect(h.level).toBe("at_risk");
    expect(h.nextAction).toMatch(/Contactar|Decidir/);
  });
  it("sin actividad ni pagos es crítica", () => {
    expect(healthScore({ ...good, daysSinceActivity: null, onboardingPct: 10, billing: "suspendable", serviceSuspended: true, scores: [1] }).level).toBe("critical");
  });
});
