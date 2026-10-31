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
import { OPERATIONS } from "@/lib/runtime/operations";
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
    ["lib/business/inventory/operations.ts", "inventory"],
    ["lib/business/purchasing/operations.ts", "purchases"],
    ["lib/business/presence/operations.ts", "presence"],
  ])("%s declara las operaciones de su dominio", (file) => {
    expect(exists(file)).toBe(true);
  });

  test.each(["inventory", "purchases", "presence"])("lib/core/operations/definitions/%s.ts ya no existe", (name) => {
    expect(exists(`lib/core/operations/definitions/${name}.ts`)).toBe(false);
  });

  test("el motor, los tipos y las definiciones de Core no importan ningún dominio", () => {
    const core = ["lib/core/operations/engine.ts", "lib/core/operations/types.ts", "lib/core/operations/audit.ts", "lib/core/operations/definitions/business.ts", "lib/core/operations/definitions/customers.ts", "lib/core/operations/definitions/events.ts", "lib/core/operations/definitions/finance.ts", "lib/core/operations/definitions/parties.ts"];
    for (const file of core) {
      const dominios = importsOf(file).filter((s) => /@\/lib\/(inventory|purchasing|presence|catalog|business|domains\/finance)\b/.test(s));
      expect(dominios, file).toEqual([]);
    }
  });

  test("el registro es la raíz de composición: está en la capa runtime (V10 · M1) y reúne los dominios", () => {
    expect(classify("lib/runtime/operations.ts", layers)?.layer).toBe("runtime");
    expect(classify("lib/core/operations/engine.ts", layers)?.layer).toBe("core");
    const imports = importsOf("lib/runtime/operations.ts");
    for (const dominio of ["@/lib/business/inventory/operations", "@/lib/business/purchasing/operations", "@/lib/business/presence/operations"]) expect(imports).toContain(dominio);
  });
});

describe("suscriptores de eventos", () => {
  test("el despachador (Core) no importa ningún dominio", () => {
    const dominios = importsOf("lib/core/events/dispatcher.ts").filter((i) => /@\/lib\/(presence|business|inventory|store|domains\/finance)\b/.test(i));
    expect(dominios).toEqual([]);
  });

  test("el suscriptor de presencia vive en su dominio y la ruta de cron lo entrega", () => {
    expect(exists("lib/business/presence/subscribers.ts")).toBe(true);
    expect(read("app/api/cron/webhooks/route.ts")).toContain("dispatchPending({ subscribers: [presenceSubscriber] })");
  });

  test("`subscribers` es obligatorio: no hay un valor por defecto que lo omita en silencio", () => {
    expect(read("lib/core/events/dispatcher.ts")).toMatch(/export async function dispatchPending\(deps: DispatchDeps\)/);
    expect(read("lib/core/events/dispatcher.ts")).toMatch(/subscribers: readonly EventSubscriber\[\];/);
  });
});

describe("límite de clientes del plan", () => {
  test("la política vive en Core, junto a la de usuarios, y Business no la define", () => {
    expect(exists("lib/core/tenancy/customer-limit.ts")).toBe(true);
    expect(read("lib/business/customers/customers-db.ts")).not.toMatch(/export async function customerLimit/);
    expect(importsOf("lib/core/entitlements/consumption-db.ts").some((i) => i.startsWith("@/lib/business/"))).toBe(false);
  });
});

describe("excepciones de la etapa E3", () => {
  test("no queda ninguna", () => {
    const exc = JSON.parse(read("docs/architecture/exceptions.json")) as { exceptions: { etapa: string }[] };
    expect(exc.exceptions.filter((e) => /^E3\b/.test(e.etapa))).toEqual([]);
  });
});
