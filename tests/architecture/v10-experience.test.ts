/**
 * V10 · Etapas X y Z · Experience.
 *
 * `dashboard`, `site`, `motion`, `hooks`, `payment-input`, `navigation` (interfaz), `onboarding` (flujo y su
 * persistencia, que usa Domains), `fonts.ts` y `vertical-icons.ts` viven en `lib/experience/` (área por ruta, sin
 * unidades en `layers.json`). `nav-types.ts` es Core (`core/capabilities`, decisión E-5) y los tipos y reglas del alta
 * son Core (`core/tenancy/onboarding`). Las reglas entre áreas las comprueba `pnpm check:layers`; aquí se fija la forma.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";

import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const layers = loadJson("docs/architecture/layers.json");
const MODULOS = ["dashboard", "fonts.ts", "hooks", "motion", "navigation", "onboarding", "payment-input", "site", "vertical-icons.ts"];
const MOVIDOS = ["admin", "dashboard", "hooks", "motion", "navigation/nav-types.ts", "onboarding", "payment-input", "site"];

describe("Etapa X · lib/experience", () => {
  test("contiene exactamente los módulos esperados", () => {
    expect(readdirSync(join(ROOT, "lib/experience")).sort()).toEqual(MODULOS);
  });

  test.each(MOVIDOS)("lib/%s ya no existe", (modulo) => {
    expect(existsSync(join(ROOT, "lib", modulo))).toBe(false);
  });

  test("lib/navigation y lib/onboarding ya no existen en la raíz (nav-types está en core/capabilities)", () => {
    expect(existsSync(join(ROOT, "lib/navigation"))).toBe(false);
    expect(existsSync(join(ROOT, "lib/onboarding"))).toBe(false);
  });

  test("lib/fonts.ts ya no existe y nav-types.ts es Core (core/capabilities), no Experience", () => {
    expect(existsSync(join(ROOT, "lib/fonts.ts"))).toBe(false);
    expect(readdirSync(join(ROOT, "lib/experience/navigation")).sort()).toEqual(["quick-create.ts", "tenant-nav.ts"]);
    expect(classify("lib/core/capabilities/nav-types.ts", layers)?.layer).toBe("core");
  });

  test.each(MODULOS)("%s está en el área experience por su ruta, sin unidad propia", (modulo) => {
    const ruta = `lib/experience/${modulo}`;
    const archivo = statSync(join(ROOT, ruta)).isDirectory()
      ? `${ruta}/${readdirSync(join(ROOT, ruta)).filter((n) => /\.tsx?$/.test(n) && !/\.test\./.test(n)).sort()[0]}`
      : ruta;
    const c = classify(archivo, layers);
    expect(c?.layer).toBe("experience");
    expect(c?.byPath).toBe(true);
  });

  test("layers.json no conserva unidades de las carpetas movidas", () => {
    for (const u of layers.units) {
      expect(u.path, u.path).not.toMatch(/^lib\/(dashboard|site|motion|hooks|payment-input|fonts)\b/);
      expect(u.path, "ya no hay unidades de navigation").not.toMatch(/^lib\/(navigation|onboarding|admin)\b/);
    }
  });
});

describe("rutas relativas a archivos que el codemod no ve", () => {
  // `next/font/local` resuelve `path` respecto al propio archivo: al mover `fonts.ts` un nivel más abajo la ruta se
  // rompía y solo lo detectaba `next build` (no `tsc` ni las pruebas). Esta prueba exige que cada fuente exista.
  test("las fuentes locales de lib/experience/fonts.ts apuntan a archivos reales", () => {
    const fichero = "lib/experience/fonts.ts";
    const rutas = [...readFileSync(join(ROOT, fichero), "utf8").matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(rutas.length, "fonts.ts ya no declara fuentes locales: revisa esta prueba").toBeGreaterThan(0);
    for (const r of rutas) expect(existsSync(join(ROOT, dirname(fichero), r)), r).toBe(true);
  });
});
