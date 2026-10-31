/**
 * V10 · Etapa I · Integrations.
 *
 * `providers`, `einvoice`, `google` y `maps` viven en `lib/integrations/` (área por ruta, sin unidades en
 * `layers.json`) y las carpetas de origen ya no existen. Las dependencias entre áreas las comprueba
 * `pnpm check:layers`; aquí se fija la forma del área.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const layers = loadJson("docs/architecture/layers.json");
const MODULOS = ["einvoice", "google", "maps", "providers"];

describe("Etapa I · lib/integrations", () => {
  test("contiene exactamente los cuatro módulos", () => {
    expect(readdirSync(join(ROOT, "lib/integrations")).sort()).toEqual(MODULOS);
  });

  test("las carpetas de origen ya no existen", () => {
    for (const d of MODULOS) expect(existsSync(join(ROOT, "lib", d)), `lib/${d}`).toBe(false);
  });

  test.each(MODULOS)("%s está en el área integrations por su ruta, sin unidad propia", (modulo) => {
    const archivo = readdirSync(join(ROOT, "lib/integrations", modulo)).find((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"))!;
    const c = classify(`lib/integrations/${modulo}/${archivo}`, layers);
    expect(c?.layer).toBe("integrations");
    expect(c?.byPath).toBe(true);
  });

  test("layers.json no conserva unidades de las carpetas de origen", () => {
    for (const u of layers.units) expect(u.path, u.path).not.toMatch(/^lib\/(providers|einvoice|google|maps)\b/);
  });
});
