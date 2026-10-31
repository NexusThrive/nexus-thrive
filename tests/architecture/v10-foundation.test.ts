/**
 * V10 · Etapa F · Foundation.
 *
 * Las utilidades puras que estaban sueltas en la raíz de `lib/` viven en `lib/foundation/` (área por ruta, sin
 * unidades en `layers.json`): `dates/` (fechas), `db/` (errores, transacciones y SQL), y los archivos planos
 * (`format`, `qr`, `rate-limit`, `ports`, `app-url`, `contact`, `image-upload`, `init-scripts`). Foundation no
 * importa ninguna otra área: lo comprueba `pnpm check:layers`; aquí se fija la forma.
 *
 * Excepciones documentadas en la raíz de `lib/`: `utils.ts` y `cn.ts` (convención de shadcn/ui, decisión E-3).
 * `temporal.d.ts` se mueve en la etapa Z.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const layers = loadJson("docs/architecture/layers.json");

const PLANOS = ["app-url", "contact", "format", "image-upload", "init-scripts", "ports", "qr", "rate-limit"];
const FECHAS = ["bogota-month", "calendar", "plain-date"];
const BASE_DATOS = ["db-errors", "db-transaction", "sql-like"];
const MOVIDOS = [...PLANOS, ...FECHAS, ...BASE_DATOS];

const produccion = (dir: string) => readdirSync(join(ROOT, dir)).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts")).sort();

describe("Etapa F · lib/foundation", () => {
  test("dates/ y db/ contienen exactamente sus tres archivos", () => {
    expect(produccion("lib/foundation/dates")).toEqual(FECHAS.map((f) => `${f}.ts`));
    expect(produccion("lib/foundation/db")).toEqual(BASE_DATOS.map((f) => `${f}.ts`));
  });

  test("los archivos planos y el kernel están en su sitio", () => {
    const planos = produccion("lib/foundation");
    for (const f of PLANOS) expect(planos, f).toContain(`${f}.ts`);
    expect(statSync(join(ROOT, "lib/foundation/kernel")).isDirectory()).toBe(true);
  });

  test.each(MOVIDOS)("%s ya no está en la raíz de lib/", (f) => {
    expect(existsSync(join(ROOT, `lib/${f}.ts`)), `lib/${f}.ts`).toBe(false);
  });

  test("la raíz de lib/ solo conserva archivos con excepción documentada", () => {
    const sueltos = readdirSync(join(ROOT, "lib")).filter((n) => statSync(join(ROOT, "lib", n)).isFile()).sort();
    // utils.ts y cn.ts: convención shadcn (E-3). temporal.d.ts (etapa Z) y la prueba de patrones de Prisma (M8) siguen pendientes.
    expect(sueltos).toEqual(["cn.ts", "prisma8-query-patterns.integration.test.ts", "temporal.d.ts", "utils.ts"]);
  });

  test.each([
    ["lib/foundation/format.ts"],
    ["lib/foundation/dates/plain-date.ts"],
    ["lib/foundation/db/db-errors.ts"],
    ["lib/foundation/ports.ts"],
    ["lib/foundation/kernel/aging.ts"],
  ])("%s está en el área foundation por su ruta, sin unidad propia", (f) => {
    const c = classify(f, layers);
    expect(c?.layer).toBe("foundation");
    expect(c?.byPath).toBe(true);
  });

  test("utils.ts y cn.ts siguen clasificados como Foundation (excepción documentada)", () => {
    for (const f of ["lib/utils.ts", "lib/cn.ts"]) expect(classify(f, layers)?.layer, f).toBe("foundation");
  });

  test("layers.json no conserva unidades de los archivos movidos", () => {
    for (const u of layers.units) {
      for (const f of MOVIDOS) expect(u.path, `${u.path} ≠ lib/${f}.ts`).not.toBe(`lib/${f}.ts`);
    }
  });
});
