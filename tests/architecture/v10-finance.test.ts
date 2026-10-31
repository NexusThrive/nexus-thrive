/**
 * V10 · M5 · Finance como familia de dominios.
 *
 * Se amplía etapa a etapa. M5.3: `tax` vive en `lib/domains/finance/tax` (área `domains` por ruta, sin unidad
 * en `layers.json`) y solo depende de Foundation. M5.2: las ayudas de captura de pagos en pantalla (teclado numérico y lectura
 * de un QR de cobro) viven en `lib/payment-input` (Experience), solo dependen del kernel de Foundation y
 * la carpeta antigua `lib/finance` ya no existe.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const layers = loadJson("docs/architecture/layers.json");

const importsOf = (rel: string): string[] =>
  [...readFileSync(join(ROOT, rel), "utf8").matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)].map((m) => m[1]);

describe("M5.2 · payment-input (Experience)", () => {
  const produccion = readdirSync(join(ROOT, "lib/payment-input")).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));

  test("contiene exactamente el teclado y la lectura de QR de cobro", () => {
    expect(produccion.sort()).toEqual(["keypad.ts", "payment-scan.ts"]);
  });

  test.each(produccion)("%s está en la capa experience", (name) => {
    expect(classify(`lib/payment-input/${name}`, layers)?.layer).toBe("experience");
  });

  test.each(produccion)("%s solo importa el kernel de Foundation o a su carpeta, y no toca datos", (name) => {
    const file = `lib/payment-input/${name}`;
    for (const spec of importsOf(file)) {
      expect(spec, file).toMatch(/^(@\/lib\/foundation\/kernel\/|\.\/)/);
    }
    expect(readFileSync(join(ROOT, file), "utf8")).not.toMatch(/\bprocess\.env\b|\bfetch\(|\bnode:|@\/prisma/);
  });

  test("la carpeta lib/finance ya no existe", () => {
    expect(existsSync(join(ROOT, "lib/finance"))).toBe(false);
  });
});

/** Todos los .ts de producción de `lib/` (sin pruebas), con ruta relativa a la raíz. */
function libSources(dir = "lib"): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(join(ROOT, path)).isDirectory()) return libSources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("M5.3 · domains/finance/tax", () => {
  const dir = "lib/domains/finance/tax";

  test("contiene exactamente tax.ts y tax-db.ts, y lib/tax ya no existe", () => {
    const produccion = readdirSync(join(ROOT, dir)).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
    expect(produccion.sort()).toEqual(["tax-db.ts", "tax.ts"]);
    expect(existsSync(join(ROOT, "lib/tax"))).toBe(false);
  });

  test.each(["tax.ts", "tax-db.ts"])("%s está en el área domains por su ruta, sin unidad propia", (name) => {
    const c = classify(`${dir}/${name}`, layers);
    expect(c?.layer).toBe("domains");
    expect(c?.byPath).toBe(true);
  });

  test("solo depende de Foundation (y de sí mismo)", () => {
    const permitidos = /^(@\/lib\/plain-date|@\/lib\/format|@\/prisma\/db|\.\/tax)$/;
    for (const name of ["tax.ts", "tax-db.ts"]) {
      for (const spec of importsOf(`${dir}/${name}`)) expect(spec, name).toMatch(permitidos);
    }
  });

  test("ningún módulo de foundation, core, business ni de automatización importa tax", () => {
    const ofensores = libSources().filter((f) => /^lib\/(foundation|core|business|events|operations|tenant|auth)\//.test(f) && importsOf(f).some((s) => s.startsWith("@/lib/domains/finance/tax")));
    expect(ofensores).toEqual([]);
  });
});
