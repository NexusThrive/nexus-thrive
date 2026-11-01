/**
 * V10 · Cierre · La raíz de `lib/`.
 *
 * Criterio de cierre aprobado: la raíz de `lib/` contiene EXACTAMENTE las nueve áreas y las dos excepciones
 * documentadas `utils.ts` y `cn.ts` (convención de shadcn/ui, decisión E-3). Nada más: un módulo nuevo va dentro de
 * un área, no en la raíz. `docs/architecture/guia-implementacion-lib.md` explica cómo elegir el área.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const layers = loadJson("docs/architecture/layers.json");

const AREAS = ["business", "core", "domains", "experience", "foundation", "industry", "integrations", "platform", "runtime"];
const EXCEPCIONES = ["cn.ts", "utils.ts"];

const hayCodigo = (dir: string): boolean =>
  readdirSync(join(ROOT, dir)).some((n) => {
    const ruta = `${dir}/${n}`;
    return statSync(join(ROOT, ruta)).isDirectory() ? hayCodigo(ruta) : /\.tsx?$/.test(n) && !/\.test\./.test(n);
  });

describe("la raíz de lib/", () => {
  test("contiene exactamente las nueve áreas y las dos excepciones documentadas", () => {
    expect(readdirSync(join(ROOT, "lib")).sort()).toEqual([...AREAS, ...EXCEPCIONES].sort());
  });

  test("las áreas de layers.json son exactamente esos nueve directorios", () => {
    expect([...layers.areas].sort()).toEqual(AREAS);
    expect(Object.keys(layers.layers).sort()).toEqual(AREAS);
  });

  test.each(AREAS)("lib/%s tiene código de producción (no se crean áreas vacías)", (area) => {
    expect(hayCodigo(`lib/${area}`), `lib/${area}`).toBe(true);
  });

  test("layers.json solo conserva las unidades que la ruta no puede deducir", () => {
    // Todo lo que está bajo lib/<área>/ se clasifica por su ruta; solo hacen falta las rutas fuera de las áreas.
    expect(layers.units.map((u: { path: string }) => u.path).sort()).toEqual(["app/", "components/", "lib/cn.ts", "lib/utils.ts", "prisma/"]);
  });

  test.each(EXCEPCIONES)("%s (excepción documentada) está clasificado como Foundation", (f) => {
    expect(classify(`lib/${f}`, layers)?.layer).toBe("foundation");
  });

  test("la capa heredada automation ya no existe", () => {
    expect(JSON.stringify(layers)).not.toContain("automation");
  });
});
