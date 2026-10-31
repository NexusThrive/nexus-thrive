/**
 * V10 · M5 · Finance como familia de dominios.
 *
 * Se amplía etapa a etapa. M5.2: las ayudas de captura de pagos en pantalla (teclado numérico y lectura
 * de un QR de cobro) viven en `lib/payment-input` (Experience), solo dependen del kernel de Foundation y
 * la carpeta antigua `lib/finance` ya no existe.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
