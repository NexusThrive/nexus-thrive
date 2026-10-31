/**
 * E3 · Cada dominio declara lo suyo y Core no lo conoce.
 *
 * - Operaciones: inventario, compras y presencia declaran sus propias operaciones; el registro
 *   (raíz de composición, capa de integraciones) las reúne. El catálogo público no cambió.
 * - Eventos: el despachador de Core recibe los suscriptores de dominio como parámetro.
 * - Límites del plan: contar clientes para el límite del plan es de Core.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { OPERATIONS } from "@/lib/operations/registry";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore el verificador es un .mjs sin tipos
import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const exists = (rel: string) => existsSync(join(ROOT, rel));
const layers = loadJson("docs/architecture/layers.json");
const importsOf = (rel: string) => [...read(rel).matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)].map((m) => m[1]);

describe("operaciones por dominio", () => {
  test("el catálogo público de operaciones no cambió (id, módulo, permiso, riesgo, ruta y orden)", () => {
    const actual = OPERATIONS.map((o) => ({ id: o.id, module: o.module, permission: o.permission, risk: o.risk, rest: o.rest, title: o.title }));
    expect(JSON.parse(JSON.stringify(actual))).toEqual(JSON.parse(read("tests/architecture/e3-operaciones.golden.json")));
  });

  test.each([
    ["lib/inventory/operations.ts", "inventory"],
    ["lib/purchasing/operations.ts", "purchases"],
    ["lib/presence/operations.ts", "presence"],
  ])("%s declara las operaciones de su dominio", (file) => {
    expect(exists(file)).toBe(true);
  });

  test.each(["inventory", "purchases", "presence"])("lib/operations/definitions/%s.ts ya no existe", (name) => {
    expect(exists(`lib/operations/definitions/${name}.ts`)).toBe(false);
  });

  test("el motor, los tipos y las definiciones de Core no importan ningún dominio", () => {
    const core = ["lib/operations/engine.ts", "lib/operations/types.ts", "lib/operations/audit.ts", "lib/operations/definitions/business.ts", "lib/operations/definitions/customers.ts", "lib/operations/definitions/events.ts", "lib/operations/definitions/finance.ts", "lib/operations/definitions/parties.ts"];
    for (const file of core) {
      const dominios = importsOf(file).filter((s) => /@\/lib\/(inventory|purchasing|presence|catalog|business|accounting|tax|receivables)\b/.test(s));
      expect(dominios, file).toEqual([]);
    }
  });

  test("el registro es la raíz de composición: está en la capa de integraciones y reúne los dominios", () => {
    expect(classify("lib/operations/registry.ts", layers)?.layer).toBe("integrations");
    expect(classify("lib/operations/engine.ts", layers)?.layer).toBe("core");
    const imports = importsOf("lib/operations/registry.ts");
    for (const dominio of ["@/lib/inventory/operations", "@/lib/purchasing/operations", "@/lib/presence/operations"]) expect(imports).toContain(dominio);
  });
});
