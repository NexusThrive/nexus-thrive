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

  test("los módulos de business no forman ciclos entre sí", () => {
    const moduleOf = (f: string) => /^lib\/business\/([^/]+)\//.exec(f)?.[1] ?? null;
    const edges = new Map<string, Set<string>>();
    for (const f of files("lib/business").filter((x) => !/\.test\./.test(x))) {
      const from = moduleOf(f);
      if (!from) continue;
      for (const { spec, typeOnly, dynamic } of parseImports(read(f))) {
        if (typeOnly || dynamic) continue;
        const to = moduleOf(resolveImport(f, spec, ROOT, exists) ?? "");
        if (to && to !== from) edges.set(from, (edges.get(from) ?? new Set()).add(to));
      }
    }
    for (const [a, set] of edges) for (const b of set) expect(edges.get(b)?.has(a) ?? false, `ciclo ${a} ⇄ ${b}`).toBe(false);
  });
});

