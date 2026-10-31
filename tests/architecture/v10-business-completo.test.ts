/**
 * V10 · Etapa B · Business completo.
 *
 * Los once módulos de `lib/business/` (los cuatro de M3 y los siete de la etapa B) viven bajo el área por
 * ruta, sin unidades en `layers.json`, y las carpetas de origen ya no existen. Las dependencias las comprueba
 * `pnpm check:layers`.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const layers = loadJson("docs/architecture/layers.json");
const MODULOS = ["catalog", "customers", "data-exchange", "growth", "inventory", "pos", "presence", "purchasing", "sales", "scheduling", "store"];
const ETAPA_B = ["data-exchange", "growth", "inventory", "pos", "presence", "purchasing", "store"];

const primerArchivo = (dir: string): string => {
  for (const n of readdirSync(join(ROOT, dir)).sort()) {
    const ruta = `${dir}/${n}`;
    if (statSync(join(ROOT, ruta)).isFile() && /\.tsx?$/.test(n) && !/\.test\./.test(n)) return ruta;
  }
  throw new Error(`sin archivos de producción en ${dir}`);
};

describe("Etapa B · lib/business", () => {
  test("contiene exactamente los once módulos", () => {
    const carpetas = readdirSync(join(ROOT, "lib/business")).filter((n) => statSync(join(ROOT, "lib/business", n)).isDirectory());
    expect(carpetas.sort()).toEqual(MODULOS);
  });

  test.each(ETAPA_B)("lib/%s ya no existe", (modulo) => {
    expect(existsSync(join(ROOT, "lib", modulo))).toBe(false);
  });

  test.each(MODULOS)("%s está en el área business por su ruta, sin unidad propia", (modulo) => {
    const c = classify(primerArchivo(`lib/business/${modulo}`), layers);
    expect(c?.layer).toBe("business");
    expect(c?.byPath).toBe(true);
  });

  test("layers.json no conserva unidades de las carpetas de origen", () => {
    for (const u of layers.units) expect(u.path, u.path).not.toMatch(/^lib\/(inventory|purchasing|pos|store|data-exchange|growth|presence)\b/);
  });
});
