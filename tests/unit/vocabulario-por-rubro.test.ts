/**
 * V · El vocabulario y las capacidades que antes se decidían comparando el rubro en el código ahora salen de la receta del rubro.
 * Estas pruebas fijan que el resultado es el mismo que daban las comparaciones, para cada uno de los rubros.
 */
import { describe, expect, test } from "vitest";
import { VERTICALS, type VerticalValue } from "@/lib/core/sectors/verticals";
import { VERTICAL_RECIPES } from "@/lib/core/sectors/catalog";
import { CAPABILITIES, type CapabilityNav } from "@/lib/capabilities/registry";
import { quickCreateActions } from "@/lib/navigation/quick-create";
import { getVerticalTerms, hasMemberAccess } from "@/lib/core/sectors/terms";

const navLabel = (moduleId: string, href: string, vertical: VerticalValue) => {
  const nav = CAPABILITIES.find((c) => c.id === moduleId)!.nav.find((n) => n.href === href)!;
  return (nav.label as CapabilityNav["label"])(getVerticalTerms(vertical), vertical);
};

describe("vocabulario por rubro (equivale a las comparaciones anteriores)", () => {
  test.each(VERTICALS)("%s: etiqueta del menú de compras", (v) => {
    expect(navLabel("purchases", "/purchases", v)).toBe(v === "restaurant" ? "Compras de insumos" : "Compras");
  });

  test.each(VERTICALS)("%s: etiqueta del menú de proyectos", (v) => {
    expect(navLabel("construction", "/projects", v)).toBe(v === "construction" ? "Obras" : "Proyectos");
  });

  test.each(VERTICALS)("%s: título de la pantalla de compras", (v) => {
    expect(getVerticalTerms(v).purchases ?? "Compras").toBe(v === "restaurant" ? "Compras de insumos" : "Compras");
  });

  test.each(VERTICALS)("%s: título de la sección de datos del cliente", (v) => {
    expect(getVerticalTerms(v).profileTitle).toBe(v === "gym" ? "Datos físicos y objetivo" : undefined);
  });

  test.each(VERTICALS)("%s: control de acceso de socios", (v) => {
    expect(hasMemberAccess(v)).toBe(v === "gym");
  });

  test("un rubro desconocido o heredado no tiene control de acceso (no cae en el rubro por defecto)", () => {
    for (const raw of ["", "barber", "services", "tourism", "otro"]) expect(hasMemberAccess(raw), raw).toBe(false);
  });

  test("solo los rubros que lo necesitan declaran vocabulario propio de compras, proyectos y perfil", () => {
    const withExtra = (key: "purchases" | "projects" | "newProject" | "profileTitle") => VERTICALS.filter((v) => VERTICAL_RECIPES[v].terms[key] !== undefined);
    expect(withExtra("purchases")).toEqual(["restaurant"]);
    expect(withExtra("projects")).toEqual(["construction"]);
    expect(withExtra("newProject")).toEqual(["construction"]);
    expect(withExtra("profileTitle")).toEqual(["gym"]);
  });

  test.each(VERTICALS)("%s: la acción «Crear» de proyecto", (v) => {
    // Con el módulo de construcción activo, la acción existe en todos los rubros y solo cambia el texto.
    const action = quickCreateActions(v, ["construction"], 10).find((a) => a.key === "new-project");
    expect(action?.label).toBe(v === "construction" ? "Nueva obra" : "Nuevo proyecto");
  });
});
