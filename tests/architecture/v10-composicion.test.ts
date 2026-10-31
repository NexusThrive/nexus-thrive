/**
 * V10 · M1 — Una sola raíz de composición: `lib/runtime`.
 *
 * Reúne lo que conoce a los dos lados de un contrato: las implementaciones de los puertos (`ports.ts`), el registro de
 * operaciones (`operations.ts`) y la conexión real de la API (`api-deps.ts`). Nadie de `lib/` la importa; solo los puntos de
 * entrada (rutas, acciones, `instrumentation.ts`) y las pruebas.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore el verificador es un .mjs sin tipos
import { classify, loadJson, parseImports } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const layers = loadJson("docs/architecture/layers.json");

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) return sources(rel);
    return /\.(ts|tsx)$/.test(name) && !/\.(test|stories)\.|\.d\.ts$/.test(name) ? [rel] : [];
  });
}
const importsOf = (rel: string) => parseImports(read(rel)).map((i: { spec: string }) => i.spec);

describe("lib/runtime es la raíz de composición", () => {
  test("sus tres piezas están en la capa runtime", () => {
    for (const f of ["lib/runtime/ports.ts", "lib/runtime/operations.ts", "lib/runtime/api-deps.ts"]) {
      expect(existsSync(join(ROOT, f)), f).toBe(true);
      expect(classify(f, layers)?.layer, f).toBe("runtime");
    }
  });

  test("las ubicaciones anteriores ya no existen (no quedan duplicados ni reexportaciones)", () => {
    for (const f of ["lib/operations/registry.ts", "lib/operations/registry.test.ts", "lib/api/runtime-deps.ts", "lib/core/operations/registry.ts", "lib/core/operations/registry.test.ts", "lib/core/api/runtime-deps.ts"]) {
      expect(existsSync(join(ROOT, f)), f).toBe(false);
    }
  });

  test("nadie de lib/ importa lib/runtime (salvo la propia carpeta)", () => {
    const offenders = sources("lib")
      .filter((f) => !f.startsWith("lib/runtime/"))
      .filter((f) => importsOf(f).some((s: string) => /^@\/lib\/runtime(\/|$)/.test(s)));
    expect(offenders).toEqual([]);
  });

  test("solo los puntos de entrada de app/ y instrumentation.ts importan lib/runtime", () => {
    const appUsers = sources("app").filter((f) => importsOf(f).some((s: string) => /^@\/lib\/runtime(\/|$)/.test(s)));
    expect(appUsers).toEqual([
      "app/[tenant]/(app)/settings/api-keys-actions.ts",
      "app/api/mcp/route.ts",
      "app/api/v1/[[...path]]/route.ts",
    ]);
    expect(read("instrumentation.ts")).toContain('import("@/lib/runtime/ports")');
  });

  test("la raíz de composición no depende de sí misma de forma circular", () => {
    for (const f of sources("lib/runtime")) {
      const runtimeImports = importsOf(f).filter((s: string) => /^@\/lib\/runtime\//.test(s));
      // operations.ts y api-deps.ts pueden usar otras piezas de runtime; ports.ts no importa a las demás.
      if (f === "lib/runtime/ports.ts") expect(runtimeImports, f).toEqual([]);
      if (f === "lib/runtime/operations.ts") expect(runtimeImports, f).toEqual([]);
    }
  });
});

describe("conexión de puertos", () => {
  const ports = read("lib/runtime/ports.ts");

  test("cada puerto se conecta una sola vez en composePorts (sin conexiones duplicadas)", () => {
    const provided = [...ports.matchAll(/(\w+Port)\.provide\(/g)].map((m) => m[1]);
    expect(provided.length).toBeGreaterThanOrEqual(7);
    expect(new Set(provided).size).toBe(provided.length);
  });

  test("un puerto sin conectar sigue fallando de forma visible", () => {
    expect(read("lib/ports.ts")).toContain("class PortNotProvidedError");
    expect(read("lib/ports.ts")).toMatch(/use\(\)\s*\{\s*if \(!registry\(\)\.provided\.has\(name\)\) throw new PortNotProvidedError\(name\)/);
  });

  test("composePorts sigue siendo la función que instrumentation.ts y vitest.setup.ts llaman", () => {
    expect(ports).toMatch(/export function composePorts\(\): string\[\]/);
    expect(read("instrumentation.ts")).toContain("composePorts()");
    expect(read("vitest.setup.ts")).toContain("composePorts()");
  });
});
