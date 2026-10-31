/**
 * V10 · M3 — `lib/business` deja de ser un cajón y pasa a módulos con una responsabilidad cada uno.
 *
 * La tabla MODULES crece con cada commit de M3 (scheduling → customers → catalog → sales). Fija: cada archivo está en su módulo,
 * ya no existe en su ubicación anterior, ninguna referencia usa las rutas antiguas y los módulos de business no forman ciclos
 * entre sí. No describe lógica de negocio: la lógica no cambió.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore el verificador es un .mjs sin tipos
import { classify, loadJson, parseImports, resolveImport } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const exists = (rel: string) => existsSync(join(ROOT, rel));
const layers = loadJson("docs/architecture/layers.json");

/** módulo → { archivo nuevo ← ubicación anterior } (solo producción; las pruebas colocadas viajan con su módulo). */
const MODULES: Record<string, Record<string, string>> = {
  scheduling: {
    "lib/business/scheduling/bookings-db.ts": "lib/business/bookings-db.ts",
    "lib/business/scheduling/calendar.ts": "lib/business/calendar.ts",
  },
  catalog: {
    "lib/business/catalog/products-db.ts": "lib/business/products-db.ts",
    "lib/business/catalog/catalog-kinds.ts": "lib/business/catalog-kinds.ts",
    "lib/business/catalog/catalog-db.ts": "lib/catalog/catalog-db.ts",
    "lib/business/catalog/barcode.ts": "lib/catalog/barcode.ts",
  },
  sales: {
    "lib/business/sales/commercial-document.ts": "lib/business/commercial-document.ts",
    "lib/business/sales/documents-db.ts": "lib/business/documents-db.ts",
    "lib/business/sales/invoice.ts": "lib/business/invoice.ts",
    "lib/business/sales/invoices-db.ts": "lib/business/invoices-db.ts",
    "lib/business/sales/charge.ts": "lib/business/charge.ts",
    "lib/business/sales/receipt-qr.ts": "lib/business/receipt-qr.ts",
    "lib/business/sales/receipt-share.ts": "lib/business/receipt-share.ts",
    "lib/business/sales/accounting-port.ts": "lib/business/accounting-port.ts",
    "lib/business/sales/fiscal-port.ts": "lib/business/fiscal-port.ts",
    "lib/business/sales/numbering-port.ts": "lib/business/numbering-port.ts",
    "lib/business/sales/money-service.ts": "lib/business/money-service.ts",
    "lib/business/sales/money.ts": "lib/business/money.ts",
    "lib/business/sales/money-error.ts": "lib/business/money-error.ts",
    "lib/business/sales/cash.ts": "lib/business/cash.ts",
    "lib/business/sales/finance-db.ts": "lib/business/finance-db.ts",
  },
  customers: {
    "lib/business/customers/customers-db.ts": "lib/business/customers-db.ts",
    "lib/business/customers/customer-fields.ts": "lib/business/customer-fields.ts",
    "lib/business/customers/customer-notes.ts": "lib/business/customer-notes.ts",
  },
};

const files = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((n) => {
    if (["node_modules", ".next", ".git", "docs", ".tools"].includes(n)) return [];
    const rel = `${dir}/${n}`;
    return statSync(join(ROOT, rel)).isDirectory() ? files(rel) : /\.(ts|tsx|mjs)$/.test(n) ? [rel] : [];
  });

describe("módulos de lib/business (M3)", () => {
  test.each(Object.entries(MODULES))("%s: sus archivos están en lib/business/%s/ y no en la ubicación anterior", (name, map) => {
    for (const [now, before] of Object.entries(map)) {
      expect(exists(now), now).toBe(true);
      expect(exists(before), `${before} no debería existir`).toBe(false);
      expect(now.startsWith(`lib/business/${name}/`), now).toBe(true);
      expect(classify(now, layers)?.layer, now).toBe("business");
    }
  });

  test("ninguna referencia en código usa una ruta anterior (absoluta, relativa, dinámica, vi.mock o literal)", () => {
    const old = Object.values(MODULES).flatMap((m) => Object.values(m));
    const bare = old.map((o) => o.replace(/\.tsx?$/, ""));
    const offenders: string[] = [];
    for (const f of [...files("app"), ...files("components"), ...files("lib"), ...files("tests"), ...files("scripts"), "eslint.config.mjs", "instrumentation.ts", "vitest.setup.ts"]) {
      if (f === "tests/architecture/v10-business.test.ts") continue;
      const text = read(f);
      for (const b of bare) if (new RegExp(`(?<![\\w/.-])${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`).test(text) || text.includes(`"@/${b}"`)) offenders.push(`${f} → ${b}`);
    }
    expect(offenders).toEqual([]);
  });

  test("las importaciones relativas de los módulos movidos siguen resolviendo a un archivo real", () => {
    for (const map of Object.values(MODULES)) {
      for (const now of Object.keys(map)) {
        for (const { spec } of parseImports(read(now))) {
          if (!spec.startsWith(".")) continue;
          expect(resolveImport(now, spec, ROOT, exists), `${now} → ${spec}`).toMatch(/\.(ts|tsx)$/);
        }
      }
    }
  });

  /**
   * Deuda arquitectónica conocida desde M3 (`V10-M3-resultados.md`, punto 4) que se acepta de forma TEMPORAL y PUNTUAL
   * al unir `inventory` con `sales` bajo `lib/business` (etapa B, `V10-decisiones.md` §8). Es el único par de módulos
   * que puede depender uno del otro, y la dependencia real es exactamente esta (valor y tipo; no solo tipos):
   */
  const CICLO_CONOCIDO = ["inventory", "sales"] as const;
  const DEPENDENCIAS_DEL_CICLO_CONOCIDO = [
    "inventory/stock-docs-db.ts → sales/money-service.ts [valor]",
    "inventory/stock-service.ts → sales/accounting-port.ts [valor]",
    "inventory/stock-service.ts → sales/money-service.ts [tipo]",
    "sales/money-service.ts → inventory/stock-service.ts [valor]",
  ];

  const moduleOf = (f: string) => /^lib\/business\/([^/]+)\//.exec(f)?.[1] ?? null;

  /** Dependencias entre módulos de `business`, con su clase (valor, tipo o dinámica). */
  function dependenciasEntreModulos() {
    const deps: { from: string; to: string; edge: string; kind: "valor" | "tipo" | "dinámica" }[] = [];
    for (const f of files("lib/business").filter((x) => !/\.test\./.test(x))) {
      const from = moduleOf(f);
      if (!from) continue;
      for (const { spec, typeOnly, dynamic } of parseImports(read(f))) {
        const target = resolveImport(f, spec, ROOT, exists) ?? "";
        const to = moduleOf(target);
        if (!to || to === from) continue;
        const kind = typeOnly ? "tipo" : dynamic ? "dinámica" : "valor";
        deps.push({ from, to, kind, edge: `${f.replace("lib/business/", "")} → ${target.replace("lib/business/", "")} [${kind}]` });
      }
    }
    return deps;
  }

  test("los módulos de business no forman ciclos entre sí, salvo el ciclo conocido inventory ⇄ sales", () => {
    const edges = new Map<string, Set<string>>();
    for (const d of dependenciasEntreModulos()) {
      if (d.kind !== "valor") continue;
      edges.set(d.from, (edges.get(d.from) ?? new Set()).add(d.to));
    }
    const conocido = (a: string, b: string) => CICLO_CONOCIDO.includes(a as never) && CICLO_CONOCIDO.includes(b as never);
    for (const [a, set] of edges) for (const b of set) {
      if (conocido(a, b)) continue;
      expect(edges.get(b)?.has(a) ?? false, `ciclo ${a} ⇄ ${b}`).toBe(false);
    }
  });

  test("el ciclo conocido inventory ⇄ sales es exactamente el documentado: ni más ni menos dependencias", () => {
    const [a, b] = CICLO_CONOCIDO;
    const reales = dependenciasEntreModulos()
      .filter((d) => (d.from === a && d.to === b) || (d.from === b && d.to === a))
      .map((d) => d.edge)
      .sort();
    // Si una dependencia desaparece, quítala de la lista; si todo el ciclo se resuelve, elimina la excepción.
    // Si aparece una nueva, no se añade aquí sin una decisión: la deuda solo puede achicarse.
    expect(reales).toEqual([...DEPENDENCIAS_DEL_CICLO_CONOCIDO].sort());
  });
});

describe("referencias de configuración a módulos movidos (M3)", () => {
  test("la regla de ESLint que prohíbe moneyTransaction en app/ apunta al archivo real", () => {
    const config = read("eslint.config.mjs");
    const names = [...config.matchAll(/name:\s*"(@\/lib\/[^"]+)"/g)].map((m) => m[1]);
    expect(names).toContain("@/lib/business/sales/money-service");
    for (const name of names) expect(exists(name.slice(2) + ".ts"), name).toBe(true);
  });
});

describe("movimientos menores de M3", () => {
  test("countries.ts es de Foundation (puro, sin imports de Nexus) y ya no está en business", () => {
    expect(exists("lib/foundation/countries.ts")).toBe(true);
    expect(exists("lib/business/countries.ts")).toBe(false);
    expect(classify("lib/foundation/countries.ts", layers)).toMatchObject({ layer: "foundation", byPath: true });
    expect(parseImports(read("lib/foundation/countries.ts"))).toEqual([]);
  });

  test("inventory.ts (reglas de existencias) vive en el módulo de inventario y business ya no lo tiene", () => {
    expect(exists("lib/business/inventory/inventory.ts")).toBe(true);
    expect(exists("lib/business/inventory.ts")).toBe(false);
    expect(classify("lib/business/inventory/inventory.ts", layers)?.layer).toBe("business");
  });

  test("lib/business solo contiene subcarpetas de módulo (las pruebas viven en tests/)", () => {
    const loose = readdirSync(join(ROOT, "lib/business")).filter((n) => statSync(join(ROOT, "lib/business", n)).isFile());
    expect(loose).toEqual([]);
    expect(readdirSync(join(ROOT, "lib/business")).filter((n) => statSync(join(ROOT, "lib/business", n)).isDirectory()).sort()).toEqual(["catalog", "customers", "data-exchange", "growth", "inventory", "pos", "presence", "purchasing", "sales", "scheduling", "store"]);
  });
});

