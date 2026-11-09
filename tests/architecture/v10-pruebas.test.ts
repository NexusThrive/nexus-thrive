/**
 * Separación física de pruebas · `lib/` es solo implementación.
 *
 * Todas las pruebas viven en `tests/` (unit/, integration/, architecture/, fixtures/) y reflejan `lib/<área>/<módulo>`.
 * Esta prueba falla si aparece un `*.test.ts` o un fixture dentro de `lib/`, o si una carpeta espejo apunta a un módulo
 * que ya no existe. Guía: `docs/wiki/10-pruebas-y-calidad/pruebas.md`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

const recorrer = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((n) => {
    const ruta = `${dir}/${n}`;
    return statSync(join(ROOT, ruta)).isDirectory() ? recorrer(ruta) : [ruta];
  });

describe("lib/ no contiene pruebas", () => {
  test("ningún *.test.ts(x) ni __fixtures__ dentro de lib/", () => {
    const intrusos = recorrer("lib").filter((f) => /\.test\.tsx?$/.test(f) || f.includes("/__fixtures__/"));
    expect(intrusos).toEqual([]);
  });

  test("Vitest solo busca pruebas en tests/", () => {
    const cfg = leer("vitest.config.mts");
    expect(cfg).toContain('include: ["tests/**/*.test.ts"]');
  });
});

describe("tests/unit e integration reflejan lib/", () => {
  const AREAS = readdirSync(join(ROOT, "lib")).filter((n) => statSync(join(ROOT, "lib", n)).isDirectory());

  test.each(["unit", "integration"])("cada carpeta de área en tests/%s existe en lib/ (salvo carpetas temáticas conocidas)", (tipo) => {
    const TEMATICAS = ["tenant", "accounting", "events", "files", "piloto"];
    const dirs = readdirSync(join(ROOT, "tests", tipo)).filter((n) => statSync(join(ROOT, "tests", tipo, n)).isDirectory());
    for (const d of dirs) {
      if (TEMATICAS.includes(d)) continue;
      expect(AREAS, `tests/${tipo}/${d}`).toContain(d);
    }
  });

  test("cada módulo con pruebas en tests/unit/<área>/<módulo> existe en lib/<área>/<módulo>", () => {
    for (const area of AREAS) {
      const base = join(ROOT, "tests/unit", area);
      if (!existsSync(base)) continue;
      for (const m of readdirSync(base)) {
        if (!statSync(join(base, m)).isDirectory()) continue;
        expect(existsSync(join(ROOT, "lib", area, m)), `lib/${area}/${m}`).toBe(true);
      }
    }
  });
});

function leer(f: string): string {
  return readFileSync(join(ROOT, f), "utf8");
}
