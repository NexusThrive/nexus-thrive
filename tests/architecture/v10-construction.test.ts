/**
 * V10 · Etapa N · Construction como sector.
 *
 * `lib/construction` vive en `lib/industry/construction` (sector por ruta, sin unidad en `layers.json`) junto a
 * `gym` y `museum`. Las reglas R1 (nadie importa una industria salvo experience y runtime) y R2 (un sector no
 * importa a otro) las comprueba `pnpm check:layers`; aquí se fija la forma.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const layers = loadJson("docs/architecture/layers.json");

describe("Etapa N · lib/industry/construction", () => {
  test("lib/industry contiene los tres sectores y lib/construction ya no existe", () => {
    expect(readdirSync(join(ROOT, "lib/industry")).sort()).toEqual(["construction", "gym", "museum"]);
    expect(existsSync(join(ROOT, "lib/construction"))).toBe(false);
  });

  test("sus archivos se clasifican como el sector construction por su ruta, sin unidad propia", () => {
    for (const f of ["lib/industry/construction/quotes.ts", "lib/industry/construction/apu-importer/anomaly-detector.ts"]) {
      expect(classify(f, layers)).toMatchObject({ layer: "industry", industry: "construction", byPath: true });
    }
  });

  test("layers.json no conserva unidades de lib/construction ni unidades por sector nuevas", () => {
    for (const u of layers.units) expect(u.path, u.path).not.toMatch(/^lib\/construction\b/);
  });
});

describe("test-integration.sh no puede perder pruebas en silencio", () => {
  // Vitest filtra por texto: una ruta que ya no existe no falla, simplemente deja de ejecutar esa prueba. Eso pasó con
  // dos pruebas del importador de APU al mover construction; esta prueba exige que cada ruta escrita a mano exista.
  test("toda ruta explícita de pruebas del script existe", () => {
    const script = readFileSync(join(ROOT, "test-integration.sh"), "utf8");
    const rutas = [...script.matchAll(/^\s+((?:lib|tests)\/\S+?\.test\.ts)\s*\\?\s*$/gm)].map((m) => m[1]);
    expect(rutas.length, "el script ya no lista rutas explícitas: revisa esta prueba").toBeGreaterThan(0);
    for (const r of rutas) expect(existsSync(join(ROOT, r)), r).toBe(true);
  });
});
