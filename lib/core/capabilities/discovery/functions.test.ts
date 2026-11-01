import { describe, expect, test } from "vitest";
import { groupFunctions, searchable, toggleProblem, type FunctionSource } from "./functions";
import { suggestFromUsage, type UsageSignals } from "./suggestions";

const none: UsageSignals = { trackedProducts: 0, customers: 0, customersWithPhone: 0, payments: 0 };
const src = (id: FunctionSource["id"], kind: FunctionSource["kind"] = "base", status: FunctionSource["status"] = "READY"): FunctionSource => ({ id, label: id, pitch: `pitch ${id}`, kind, status });

describe("sugerencias por uso", () => {
  test("sin actividad no sugiere nada", () => expect(suggestFromUsage(none, new Set(["crm"]))).toEqual([]));
  test("compras se sugiere cuando hay productos con inventario y la función está apagada", () => {
    const s = suggestFromUsage({ ...none, trackedProducts: 3 }, new Set(["crm", "inventory"]));
    expect(s.map((x) => x.module)).toEqual(["purchases"]);
    expect(s[0].reason).toContain("3 productos");
    expect(suggestFromUsage({ ...none, trackedProducts: 3 }, new Set(["inventory", "purchases"]))).toEqual([]); // ya la usa
    expect(suggestFromUsage({ ...none, trackedProducts: 3 }, new Set(["crm"]))).toEqual([]); // sin inventario, primero inventario
  });
  test("facturación, WhatsApp e inventario siguen el volumen de uso", () => {
    const active = new Set(["crm"]);
    expect(suggestFromUsage({ ...none, payments: 10 }, active).map((x) => x.module)).toEqual(["inventory", "billing"]);
    expect(suggestFromUsage({ ...none, customersWithPhone: 5 }, active).map((x) => x.module)).toEqual(["whatsapp"]);
    expect(suggestFromUsage({ ...none, customersWithPhone: 4 }, active)).toEqual([]);
  });
});

describe("grupos de funciones", () => {
  const sources = [src("dashboard"), src("crm"), src("inventory"), src("purchases"), src("construction", "specialized"), src("orders", "specialized", "PLANNED"), src("whatsapp", "base", "BETA")];
  test("el Inicio no se lista; lo planeado no se ofrece; lo activo va en «En uso»", () => {
    const g = groupFunctions(sources, new Set(["dashboard", "crm"]), new Set(), [], "tienda");
    expect(g.inUse.map((i) => i.id)).toEqual(["crm"]);
    const all = [...g.inUse, ...g.suggested, ...g.more].map((i) => i.id);
    expect(all).not.toContain("dashboard");
    expect(all).not.toContain("orders");
  });
  test("lo sugerido por uso lleva su motivo; lo del perfil, el rubro; el resto va en «Más funciones»", () => {
    const g = groupFunctions(sources, new Set(["crm", "inventory"]), new Set(["purchases", "whatsapp"]), [{ module: "purchases", reason: "Tienes 2 productos" }], "ferretería");
    expect(g.suggested.map((i) => [i.id, i.reason])).toEqual([["purchases", "Tienes 2 productos"], ["whatsapp", "Va bien con un negocio de ferretería."]]);
    expect(g.more.map((i) => i.id)).toEqual(["construction"]);
  });
  test("lo planeado no se ofrece pero se informa como próximamente", () => {
    const g = groupFunctions(sources, new Set(["crm"]), new Set(), [], "x");
    expect(g.planned.map((i) => i.id)).toEqual(["orders"]);
    expect([...g.inUse, ...g.suggested, ...g.more].map((i) => i.id)).not.toContain("orders");
  });
  test("las especialidades y las betas se marcan, y las dependencias se declaran", () => {
    const g = groupFunctions(sources, new Set(), new Set(), [], "x");
    const byId = new Map([...g.inUse, ...g.suggested, ...g.more].map((i) => [i.id, i]));
    expect(byId.get("construction")?.specialty).toBe(true);
    expect(byId.get("whatsapp")?.beta).toBe(true);
    expect(byId.get("purchases")?.needs).toBe("inventory");
  });
});

describe("dependencias al cambiar una función", () => {
  const label = (id: string) => id;
  test("encender exige la función de la que depende", () => {
    expect(toggleProblem("pos", true, new Set(["crm"]), label)).toContain("enciende «inventory» primero");
    expect(toggleProblem("pos", true, new Set(["crm", "inventory"]), label)).toBeNull();
    expect(toggleProblem("crm", true, new Set(), label)).toBeNull(); // sin dependencia
  });
  test("apagar exige que ninguna encendida la use", () => {
    expect(toggleProblem("finance", false, new Set(["finance", "accounting", "receivables"]), label)).toContain("«accounting»");
    expect(toggleProblem("billing", false, new Set(["billing", "einvoicing"]), label)).toContain("la usa");
    expect(toggleProblem("finance", false, new Set(["finance"]), label)).toBeNull();
    expect(toggleProblem("finance", false, new Set(["finance", "accounting"]), label)).not.toContain("receivables");
  });
  test("la búsqueda ignora tildes y mayúsculas", () => {
    expect(searchable({ label: "Facturación", pitch: "Cuentas de cobro", category: "Ventas y cobros" })).toContain("facturacion");
  });
});
