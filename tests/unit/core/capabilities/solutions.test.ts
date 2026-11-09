import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "@/lib/core/capabilities/registry";
import { CAPABILITY_SOLUTIONS, SOLUTION_IDS, SOLUTION_OF_VERTICAL, isCompatible, isEngine, isNativeTo, nativeCapabilities, solutionForVertical } from "@/lib/core/capabilities/solutions";
import { groupFunctions } from "@/lib/core/capabilities/discovery/functions";
import type { ModuleValue } from "@/lib/core/capabilities/modules";
import { VERTICAL_RECIPES } from "@/lib/core/sectors/catalog";
import { VERTICALS } from "@/lib/core/sectors/verticals";

/** HU-soluciones-01: el manifiesto cubre todo el registro y ningún negocio existente pierde lo que su receta le da. */
describe("manifiesto de soluciones", () => {
  it("clasifica exactamente las capacidades del registro", () => {
    expect(Object.keys(CAPABILITY_SOLUTIONS).sort()).toEqual(CAPABILITIES.map((c) => c.id).sort());
  });

  it("asigna una solución a cada rubro, y un rubro desconocido cae en Business", () => {
    for (const v of VERTICALS) expect(SOLUTION_IDS, v).toContain(SOLUTION_OF_VERTICAL[v]);
    expect(solutionForVertical("rubro_inventado")).toBe("business");
    expect(solutionForVertical(null)).toBe("business");
  });

  it("transición sin pérdida: todo lo que la receta de un rubro enciende es compatible con su solución", () => {
    for (const v of VERTICALS) {
      const solution = solutionForVertical(v);
      for (const m of VERTICAL_RECIPES[v].modules) expect(isCompatible(solution, m as ModuleValue), `${v} → ${solution}: ${m}`).toBe(true);
    }
  });

  it("los motores compartidos sirven a todas las soluciones", () => {
    for (const s of SOLUTION_IDS) for (const m of ["crm", "finance", "payments", "whatsapp", "inventory"] as ModuleValue[]) expect(isCompatible(s, m)).toBe(true);
    expect(isEngine("crm")).toBe(true);
    expect(isEngine("memberships")).toBe(false);
  });

  it("cada solución trae lo suyo y no lo ajeno: un gimnasio no ve pedidos ni obras", () => {
    expect(nativeCapabilities("gym")).toEqual(["memberships"]);
    expect(isCompatible("gym", "orders")).toBe(false);
    expect(isCompatible("gym", "construction")).toBe(false);
    expect(isCompatible("food", "memberships")).toBe(false);
    expect(isNativeTo("food", "orders")).toBe(true);
    expect(isNativeTo("commerce", "orders")).toBe(true);
    expect(isCompatible("business", "memberships")).toBe(true);
    expect(isCompatible("business", "construction")).toBe(true);
  });
});

describe("Funciones por solución", () => {
  const sources = [
    { id: "crm", label: "Clientes", pitch: "", kind: "base", status: "READY" },
    { id: "memberships", label: "Membresías", pitch: "", kind: "specialized", status: "READY" },
    { id: "construction", label: "Obras", pitch: "", kind: "specialized", status: "READY" },
  ] as const;
  const compatible = (id: ModuleValue) => isCompatible("gym", id);

  it("no ofrece lo que la solución no admite", () => {
    const g = groupFunctions(sources, new Set(["crm"]), new Set(), [], "gimnasio", compatible);
    const offered = [...g.suggested, ...g.more].map((i) => i.id);
    expect(offered).toEqual(["memberships"]);
  });

  it("conserva siempre lo que el negocio ya usa, aunque su solución no lo admita", () => {
    const g = groupFunctions(sources, new Set(["crm", "construction"]), new Set(), [], "gimnasio", compatible);
    expect(g.inUse.map((i) => i.id).sort()).toEqual(["construction", "crm"]);
  });

  it("sin filtro de compatibilidad se comporta como antes", () => {
    const g = groupFunctions(sources, new Set(), new Set(), [], "gimnasio");
    expect([...g.suggested, ...g.more].map((i) => i.id).sort()).toEqual(["construction", "crm", "memberships"]);
  });
});
