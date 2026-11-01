import { describe, expect, it } from "vitest";
import { checklist } from "./onboarding-checklist";

const none = { onboardingCompleted: false, planSelected: false, hasManager: false, contacts: 0, users: 1, customers: 0, movements: 0, extraModules: 0 };

describe("checklist de onboarding", () => {
  it("empieza en cero y señala el siguiente paso", () => {
    const c = checklist(none);
    expect(c.done).toBe(0);
    expect(c.next?.key).toBe("registro");
  });
  it("marca solo con datos reales", () => {
    const c = checklist({ ...none, onboardingCompleted: true, planSelected: true, customers: 2, movements: 1 });
    expect(c.done).toBe(3);
    expect(c.steps.find((s) => s.key === "clientes")?.done).toBe(false);
    expect(c.next?.key).toBe("responsable");
  });
  it("completo al 100 %", () => {
    expect(checklist({ onboardingCompleted: true, planSelected: true, hasManager: true, contacts: 1, users: 2, customers: 5, movements: 3, extraModules: 2 }).pct).toBe(100);
  });
});
