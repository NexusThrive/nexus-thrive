/**
 * V10 · M5 · Finance como familia de dominios.
 *
 * Se amplía etapa a etapa. M5.5: `receivables` vive en `lib/domains/finance/receivables` y solo la importa `app/`. M5.4: `accounting` vive en `lib/domains/finance/accounting`, depende de Foundation, de Business
 * (error y servicio de dinero, tabla de intercambio) y de `tax`, y nadie por debajo de Experience lo importa. M5.3: `tax` vive en `lib/domains/finance/tax` (área `domains` por ruta, sin unidad
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

describe("M5.4 · domains/finance/accounting", () => {
  const dir = "lib/domains/finance/accounting";
  const produccion = ["accounting-db.ts", "ledger-db.ts", "ledger.ts", "puc.ts", "reports-db.ts", "reports.ts"];

  test("contiene exactamente los seis módulos de producción, y lib/accounting ya no existe", () => {
    const hoy = readdirSync(join(ROOT, dir)).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
    expect(hoy.sort()).toEqual(produccion);
    expect(existsSync(join(ROOT, "lib/accounting"))).toBe(false);
  });

  test.each(produccion)("%s está en el área domains por su ruta, sin unidad propia", (name) => {
    const c = classify(`${dir}/${name}`, layers);
    expect(c?.layer).toBe("domains");
    expect(c?.byPath).toBe(true);
  });

  test("solo depende de Foundation, de Business (lista cerrada), de tax y de sí mismo", () => {
    const permitidos = new RegExp(
      "^(node:crypto|@/prisma/db|@/lib/format|@/lib/business/sales/money-error|@/lib/data-exchange/table|@/lib/domains/finance/tax/tax|\\./(puc|ledger|accounting-db|reports))$",
    );
    for (const name of produccion) {
      for (const spec of importsOf(`${dir}/${name}`)) expect(spec, name).toMatch(permitidos);
    }
  });

  test("ningún módulo de foundation, core, business ni de automatización importa accounting", () => {
    const ofensores = libSources().filter(
      (f) => /^lib\/(foundation|core|business|events|operations|tenant|auth)\//.test(f) && importsOf(f).some((s) => s.startsWith("@/lib/domains/finance/accounting")),
    );
    expect(ofensores).toEqual([]);
  });
});

describe("M5.5 · domains/finance/receivables", () => {
  const file = "lib/domains/finance/receivables/receivables-db.ts";

  test("contiene solo receivables-db.ts, y lib/receivables ya no existe", () => {
    const hoy = readdirSync(join(ROOT, "lib/domains/finance/receivables")).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"));
    expect(hoy).toEqual(["receivables-db.ts"]);
    expect(existsSync(join(ROOT, "lib/receivables"))).toBe(false);
  });

  test("está en el área domains por su ruta, sin unidad propia", () => {
    const c = classify(file, layers);
    expect(c?.layer).toBe("domains");
    expect(c?.byPath).toBe(true);
  });

  test("solo depende de Foundation, del kernel, de Business (dinero), de accounting y de tax", () => {
    const permitidos =
      /^(@\/prisma\/db|@\/lib\/format|@\/lib\/foundation\/kernel\/aging|@\/lib\/business\/sales\/money-service|@\/lib\/domains\/finance\/(accounting\/ledger-db|tax\/tax))$/;
    for (const spec of importsOf(file)) expect(spec).toMatch(permitidos);
  });

  test("ninguna capa de lib/ por debajo de domains la importa", () => {
    const ofensores = libSources().filter(
      (f) => /^lib\/(foundation|core|business|events|operations|tenant|auth)\//.test(f) && importsOf(f).some((s) => s.startsWith("@/lib/domains/finance/receivables")),
    );
    expect(ofensores).toEqual([]);
  });
});
