import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { MODULES, MODULE_LABELS, isModule } from "@/lib/core/capabilities/modules";
import { MODULE_DESCRIPTIONS, MODULE_ICONS } from "@/lib/experience/onboarding/module-meta";
import { defaultPricingConfig } from "@/lib/core/entitlements/pricing";
import { CAPABILITIES, CAPABILITY_CATEGORIES, CHILDREN_OF } from "@/lib/core/capabilities/registry";

/** ADR-0003: una sola declaración por capacidad; todo lo demás se deriva. */
describe("registro de capacidades", () => {
  test("ids únicos", () => {
    const ids = CAPABILITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("los catálogos derivados cubren exactamente el registro", () => {
    const ids = CAPABILITIES.map((c) => c.id).sort();
    expect([...MODULES].sort()).toEqual(ids);
    expect(Object.keys(MODULE_LABELS).sort()).toEqual(ids);
    expect(Object.keys(MODULE_ICONS).sort()).toEqual(ids);
    expect(Object.keys(MODULE_DESCRIPTIONS).sort()).toEqual(ids);
    expect(defaultPricingConfig().modules.map((m) => m.module).sort()).toEqual(ids);
  });

  test("cada ruta del menú tiene su página", () => {
    for (const c of CAPABILITIES) {
      for (const nav of c.nav) {
        const route = nav.href.split("?")[0];
        const page = join(process.cwd(), "app/[tenant]/(app)", route, "page.tsx");
        expect(existsSync(page), `${c.id}: falta la página de "${route || "/"}"`).toBe(true);
      }
    }
  });

  test("Cotizaciones (HU-cotizacion-01) ya está disponible y su pantalla existe", () => {
    const quotes = CAPABILITIES.find((c) => c.id === "quotes");
    expect(quotes?.status).toBe("READY");
    expect(quotes?.nav.map((n) => n.href)).toEqual(["/ventas/cotizaciones"]);
  });

  test("isModule valida contra el registro (la base guarda texto)", () => {
    expect(isModule("construction")).toBe(true);
    expect(isModule("nomina")).toBe(false);
  });
});

describe("categorías y funciones hijas", () => {
  test("toda función tiene una categoría conocida", () => {
    for (const c of CAPABILITIES) expect(CAPABILITY_CATEGORIES).toContain(c.category);
  });
  test("cada pantalla pertenece a una sola función (ninguna ruta repetida salvo /orders)", () => {
    const owners = new Map<string, string[]>();
    for (const c of CAPABILITIES) for (const n of c.nav) owners.set(n.href.split("?")[0]!, [...(owners.get(n.href.split("?")[0]!) ?? []), c.id]);
    const shared = [...owners].filter(([, ids]) => ids.length > 1).map(([href]) => href);
    // /orders (Pedidos) la abren Pedidos y Mi sitio web (los pedidos de la tienda). El menú no la repite.
    expect(shared).toEqual(["/ventas/pedidos"]);
  });
  test("las funciones hijas apuntan a una madre real y viajan con ella", () => {
    const ids = new Set<string>(CAPABILITIES.map((c) => c.id));
    for (const [parent, kids] of Object.entries(CHILDREN_OF)) {
      expect(ids.has(parent)).toBe(true);
      for (const kid of kids) expect(ids.has(kid)).toBe(true);
    }
    expect(CHILDREN_OF.finance).toEqual(["receivables", "accounting", "taxes"]);
    expect(CHILDREN_OF.payments).toEqual(["pos", "online_payments"]);
  });
});
