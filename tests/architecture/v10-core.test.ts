/**
 * V10 · Etapa C · Core.
 *
 * Las doce carpetas de Core que estaban en la raíz de `lib/` viven en `lib/core/` (área por ruta, sin unidades en
 * `layers.json`): `tenant` → `tenancy`, `plans` + `usage` → `entitlements`, `functions` → `capabilities/discovery`,
 * `mcp` → `api/mcp`. `api` y `mcp` dejaron de ser Integrations. Las reglas entre áreas (Core solo importa Foundation)
 * las comprueba `pnpm check:layers`; aquí se fija la forma y lo que ese verificador no ve.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const layers = loadJson("docs/architecture/layers.json");
const MODULOS = ["api", "auth", "capabilities", "entitlements", "events", "files", "operations", "parties", "sectors", "tenancy"];
const ORIGENES = ["tenant", "auth", "parties", "files", "plans", "usage", "capabilities", "functions", "events", "operations", "api", "mcp"];

describe("Etapa C · lib/core", () => {
  test("contiene exactamente los diez módulos", () => {
    expect(readdirSync(join(ROOT, "lib/core")).sort()).toEqual(MODULOS);
  });

  test.each(ORIGENES)("lib/%s ya no existe", (carpeta) => {
    expect(existsSync(join(ROOT, "lib", carpeta)), `lib/${carpeta}`).toBe(false);
  });

  test("mcp vive dentro de api y functions dentro de capabilities/discovery", () => {
    expect(existsSync(join(ROOT, "lib/core/api/mcp/server.ts"))).toBe(true);
    expect(existsSync(join(ROOT, "lib/core/capabilities/discovery/functions.ts"))).toBe(true);
  });

  test.each(MODULOS)("%s está en el área core por su ruta, sin unidad propia", (modulo) => {
    const archivo = readdirSync(join(ROOT, "lib/core", modulo)).find((n) => /\.tsx?$/.test(n) && !/\.test\./.test(n))!;
    const c = classify(`lib/core/${modulo}/${archivo}`, layers);
    expect(c?.layer).toBe("core");
    expect(c?.byPath).toBe(true);
  });

  test("api, mcp y functions ya no figuran en otras capas", () => {
    for (const f of ["lib/core/api/handler.ts", "lib/core/api/mcp/server.ts", "lib/core/capabilities/discovery/functions.ts"]) {
      expect(classify(f, layers)?.layer, f).toBe("core");
    }
  });

  test("layers.json no conserva unidades de las carpetas movidas", () => {
    for (const u of layers.units) expect(u.path, u.path).not.toMatch(new RegExp(`^lib/(${ORIGENES.join("|")})\\b`));
  });

  test("nav-types y onboarding/types siguen en Core fuera de lib/core hasta la etapa Z", () => {
    expect(classify("lib/navigation/nav-types.ts", layers)?.layer).toBe("core");
    expect(classify("lib/onboarding/types.ts", layers)?.layer).toBe("core");
  });

  test("las pruebas de integración con nombre propio del script existen en su ruta nueva", () => {
    const script = readFileSync(join(ROOT, "test-integration.sh"), "utf8");
    for (const r of ["lib/core/tenancy/db.archived-rejection.test.ts", "lib/core/tenancy/db.cache-invalidation.test.ts"]) {
      expect(script, r).toContain(r);
      expect(existsSync(join(ROOT, r)), r).toBe(true);
    }
    expect(script).not.toContain("lib/tenant/");
  });
});
