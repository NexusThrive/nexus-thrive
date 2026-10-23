import { describe, expect, test } from "vitest";
import { canGovernBudget } from "./context";

/**
 * Rol D7 del presupuesto: solo OWNER y SUPERADMIN gobiernan (bloquear,
 * desbloquear, AIU, aprobar línea base, cambio de estado del proyecto).
 */
describe("canGovernBudget (D7)", () => {
  test("OWNER y SUPERADMIN gobiernan el presupuesto", () => {
    expect(canGovernBudget("OWNER")).toBe(true);
    expect(canGovernBudget("SUPERADMIN")).toBe(true);
  });

  test("STAFF no gobierna el presupuesto", () => {
    expect(canGovernBudget("STAFF")).toBe(false);
  });
});
