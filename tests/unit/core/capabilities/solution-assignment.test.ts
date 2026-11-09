import { describe, expect, it } from "vitest";
import { assess, manualSolution, resolveSolution, withSolution } from "@/lib/core/capabilities/solution-assignment";

describe("asignación de solución (HU-transicion-01)", () => {
  it("sale del rubro y una elección manual la reemplaza", () => {
    expect(resolveSolution("restaurant", null)).toEqual({ solution: "food", source: "auto" });
    expect(resolveSolution("restaurant", { solution: "business" })).toEqual({ solution: "business", source: "manual" });
    expect(resolveSolution("restaurant", { solution: "inventada" })).toEqual({ solution: "food", source: "auto" });
    expect(manualSolution("no es objeto")).toBeNull();
  });

  it("fijar o quitar la solución conserva el resto de los ajustes", () => {
    const settings = { slots: ["10:00"], capacity: 40 };
    expect(withSolution(settings, "museum")).toEqual({ slots: ["10:00"], capacity: 40, solution: "museum" });
    expect(withSolution({ ...settings, solution: "museum" }, null)).toEqual(settings);
    expect(withSolution(null, "gym")).toEqual({ solution: "gym" });
    expect(settings).toEqual({ slots: ["10:00"], capacity: 40 });
  });

  it("un negocio claro no es dudoso", () => {
    expect(assess("retail", null, ["dashboard", "crm", "orders", "inventory"])).toMatchObject({ solution: "commerce", doubtful: false, outside: [] });
  });

  it("usar funciones de otra solución, o un rubro ambiguo, lo marca para revisión sin quitarle nada", () => {
    const hybrid = assess("gym", null, ["crm", "memberships", "construction"]);
    expect(hybrid).toMatchObject({ solution: "gym", doubtful: true, outside: ["construction"] });
    expect(hybrid.reasons[0]).toContain("construction");
    expect(assess("hospitality", null, ["crm"])).toMatchObject({ solution: "food", doubtful: true });
  });

  it("una vez revisado a mano deja de ser dudoso, pero conserva lo que usa", () => {
    expect(assess("gym", { solution: "gym" }, ["crm", "construction"])).toMatchObject({ source: "manual", doubtful: false, outside: ["construction"] });
  });
});
