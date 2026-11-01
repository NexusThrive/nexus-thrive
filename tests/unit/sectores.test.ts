/**
 * V10 · M2 — Catálogo y registro de sectores (lib/core/sectors).
 *
 * Fija: el catálogo base sigue siendo el mismo, lo desconocido usa el sector general y neutral (D-V10-5), un sector nuevo se
 * incorpora registrándolo (sin tocar módulos compartidos) y el registro rechaza definiciones incompletas.
 */
import { afterEach, describe, expect, test } from "vitest";
import { MODULES, withChildModules } from "@/lib/capabilities/modules";
import { DEFAULT_MODULES_BY_VERTICAL, SECTOR_CATALOG, VERTICAL_RECIPES, type SectorDefinition } from "@/lib/core/sectors/catalog";
import { findSector, getSector, listSectors, registerSector } from "@/lib/core/sectors/registry";
import { getQuoteTerms, getVerticalTerms, hasMemberAccess } from "@/lib/core/sectors/terms";
import { LEGACY_VERTICAL_ALIASES, SIGNUP_VERTICALS, VERTICALS, VERTICAL_ICONS, VERTICAL_LABELS, isVertical, normalizeVertical } from "@/lib/core/sectors/verticals";
import { composeSectors } from "@/lib/runtime/sectors";

const GENERAL = VERTICAL_RECIPES.general.terms;
const demo = (over: Partial<SectorDefinition> = {}): SectorDefinition => ({
  id: "taller_demo",
  label: "Taller de demostración",
  icon: "🛠️",
  signup: false,
  modules: ["dashboard", "crm"],
  terms: { customer: "Cliente", customers: "Clientes", booking: "Orden", bookings: "Órdenes", item: "Repuesto", items: "Repuestos", purchases: "Compras de repuestos" },
  ...over,
});
const cleanup: (() => void)[] = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()!();
});

describe("catálogo base", () => {
  test("hay una definición por cada sector y cada una coincide con las tablas derivadas", () => {
    expect(SECTOR_CATALOG.map((s) => s.id)).toEqual([...VERTICALS]);
    for (const s of SECTOR_CATALOG) {
      expect(s.label, s.id).toBe(VERTICAL_LABELS[s.id as keyof typeof VERTICAL_LABELS]);
      expect(s.icon, s.id).toBe(VERTICAL_ICONS[s.id as keyof typeof VERTICAL_ICONS]);
      expect(s.signup, s.id).toBe((SIGNUP_VERTICALS as readonly string[]).includes(s.id));
      expect(s.modules, s.id).toBe(DEFAULT_MODULES_BY_VERTICAL[s.id as keyof typeof DEFAULT_MODULES_BY_VERTICAL]);
      expect(s.modules.every((m) => MODULES.includes(m)), s.id).toBe(true);
    }
  });

  test("la receta incluye las funciones que se desprendieron de otra", () => {
    for (const s of SECTOR_CATALOG) expect([...s.modules], s.id).toEqual(withChildModules(s.modules));
  });

  test("todo sector define los seis términos obligatorios", () => {
    for (const s of SECTOR_CATALOG) for (const k of ["customer", "customers", "booking", "bookings", "item", "items"] as const) expect(s.terms[k]?.trim(), `${s.id}.${k}`).toBeTruthy();
  });

  test("solo gimnasio lleva control de acceso de socios y solo construcción/carpintería personalizan cotizaciones", () => {
    expect(SECTOR_CATALOG.filter((s) => s.memberAccess).map((s) => s.id)).toEqual(["gym"]);
    expect(SECTOR_CATALOG.filter((s) => s.quoteTerms).map((s) => s.id)).toEqual(["construction", "carpentry"]);
  });
});

describe("sectores desconocidos (D-V10-5)", () => {
  test.each(["", "desconocido", "GYM", "Gym ", "futuro_sector"])("«%s» usa el sector general y neutral, no el de gimnasio", (value) => {
    expect(normalizeVertical(value)).toBe("general");
    expect(getSector(value).id).toBe("general");
    expect(getVerticalTerms(value)).toEqual(GENERAL);
    expect(getVerticalTerms(value).customer).not.toBe("Socio");
    expect(getQuoteTerms(value)).toEqual(getQuoteTerms("general"));
    expect(hasMemberAccess(value)).toBe(false);
  });

  test("los alias heredados siguen yendo a su rubro actual", () => {
    for (const [legacy, current] of Object.entries(LEGACY_VERTICAL_ALIASES)) {
      expect(normalizeVertical(legacy)).toBe(current);
      expect(getVerticalTerms(legacy)).toEqual(getVerticalTerms(current));
    }
    expect(getVerticalTerms("barber").customer).toBe(getVerticalTerms("beauty").customer);
  });

  test("un alias heredado no hereda capacidades por accidente (el acceso de socios exige el id exacto)", () => {
    expect(hasMemberAccess("gym")).toBe(true);
    for (const legacy of Object.keys(LEGACY_VERTICAL_ALIASES)) expect(hasMemberAccess(legacy), legacy).toBe(false);
  });

  test("isVertical reconoce solo la lista cerrada", () => {
    expect(isVertical("gym")).toBe(true);
    expect(isVertical("barber")).toBe(false);
    expect(isVertical("")).toBe(false);
  });
});

describe("registro explícito de sectores", () => {
  test("un sector nuevo se incorpora registrándolo, sin tocar ningún módulo compartido", () => {
    expect(findSector("taller_demo")).toBeUndefined();
    expect(getVerticalTerms("taller_demo")).toEqual(GENERAL); // antes de registrar es desconocido
    cleanup.push(registerSector(demo()));
    expect(getVerticalTerms("taller_demo").bookings).toBe("Órdenes");
    expect(getVerticalTerms("taller_demo").purchases).toBe("Compras de repuestos");
    expect(listSectors().map((s) => s.id)).toContain("taller_demo");
    expect(getSector("taller_demo").label).toBe("Taller de demostración");
  });

  test("retirar el registro devuelve el sector a desconocido", () => {
    const unregister = registerSector(demo());
    unregister();
    expect(findSector("taller_demo")).toBeUndefined();
    expect(getVerticalTerms("taller_demo")).toEqual(GENERAL);
  });

  test("registrar un sector con capacidad de acceso de socios y términos de cotización los respeta", () => {
    cleanup.push(registerSector(demo({ memberAccess: true, quoteTerms: { ...getQuoteTerms("general"), quote: "Orden de trabajo" } })));
    expect(hasMemberAccess("taller_demo")).toBe(true);
    expect(getQuoteTerms("taller_demo").quote).toBe("Orden de trabajo");
  });

  test("una industria puede reemplazar la definición base de su sector y al retirarla vuelve la base", () => {
    const base = getSector("museum");
    cleanup.push(registerSector(demo({ id: "museum", label: "Museo (industria)" })));
    expect(getSector("museum").label).toBe("Museo (industria)");
    cleanup.pop()!();
    expect(getSector("museum")).toBe(base);
  });

  test("registrar no altera las vistas estáticas del catálogo base", () => {
    const before = JSON.stringify(VERTICAL_RECIPES);
    cleanup.push(registerSector(demo({ id: "gym", terms: { ...GENERAL, customer: "Atleta" } })));
    expect(getVerticalTerms("gym").customer).toBe("Atleta");
    expect(JSON.stringify(VERTICAL_RECIPES)).toBe(before);
  });

  test.each([
    [{ id: "Sector Raro" }, /id/],
    [{ id: "" }, /id/],
    [{ label: "  " }, /nombre/],
    [{ terms: { customer: "", customers: "x", booking: "x", bookings: "x", item: "x", items: "x" } }, /customer/],
  ])("rechaza una definición incompleta %#", (over, message) => {
    expect(() => registerSector(demo(over as Partial<SectorDefinition>))).toThrow(message);
    expect(findSector("taller_demo")).toBeUndefined();
  });

  test("composeSectors es idempotente y hoy no registra ninguna industria (llegan en M7)", () => {
    expect(composeSectors()).toEqual([]);
    expect(composeSectors()).toEqual([]);
    expect(listSectors().map((s) => s.id)).toEqual([...VERTICALS]);
  });
});
