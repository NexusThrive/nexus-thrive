/**
 * V10 · M2 — El catálogo de sectores vive en Core, separado de la administración de la plataforma, y no depende de industrias.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore el verificador es un .mjs sin tipos
import { classify, loadJson, parseImports } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const layers = loadJson("docs/architecture/layers.json");
const exceptions = loadJson("docs/architecture/exceptions.json");
const importsOf = (rel: string) => parseImports(read(rel)).map((i: { spec: string }) => i.spec);
const ls = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((n) => (statSync(join(ROOT, dir, n)).isDirectory() ? ls(`${dir}/${n}`) : [`${dir}/${n}`]));

const SECTOR_FILES = ["verticals", "lexicon", "catalog", "registry", "terms"].map((n) => `lib/core/sectors/${n}.ts`);

describe("catálogo de sectores en Core", () => {
  test.each(SECTOR_FILES)("%s existe y es de Core por su ruta (sin unidad en layers.json)", (file) => {
    expect(existsSync(join(ROOT, file))).toBe(true);
    expect(classify(file, layers)).toMatchObject({ layer: "core", byPath: true });
  });

  test("las ubicaciones anteriores ya no existen", () => {
    expect(existsSync(join(ROOT, "lib/vertical-terms.ts"))).toBe(false);
  });

  test("separado de la administración: los sectores no importan lib/admin y catalogs.ts ya no contiene sectores ni módulos", () => {
    for (const f of SECTOR_FILES) expect(importsOf(f).filter((s: string) => /^@\/lib\/admin\b/.test(s)), f).toEqual([]);
    const catalogs = read("lib/admin/catalogs.ts");
    for (const symbol of ["VERTICALS", "VERTICAL_RECIPES", "VerticalTerms", "MODULES", "normalizeVertical", "withChildModules"]) {
      expect(catalogs, symbol).not.toMatch(new RegExp(`\\b${symbol}\\b\\s*[=:(]|export (const|type|function) ${symbol}\\b`));
    }
  });

  test("los sectores solo importan Core y Foundation: ninguna industria, negocio ni finanzas", () => {
    const allowed = /^(\.\/|@\/lib\/capabilities\/|@\/lib\/core\/sectors\/)/;
    for (const f of SECTOR_FILES) {
      const bad = importsOf(f).filter((s: string) => !allowed.test(s));
      expect(bad, f).toEqual([]);
    }
  });

  test("hojas sin ciclo: verticals y lexicon no importan nada de Nexus; el registro de capacidades solo toma de ellas sus tipos", () => {
    expect(importsOf("lib/core/sectors/verticals.ts")).toEqual([]);
    expect(importsOf("lib/core/sectors/lexicon.ts").filter((s: string) => s.startsWith("@/"))).toEqual([]);
    const fromRegistry = importsOf("lib/capabilities/registry.ts").filter((s: string) => s.startsWith("@/lib/core/sectors/"));
    expect(fromRegistry.sort()).toEqual(["@/lib/core/sectors/lexicon", "@/lib/core/sectors/verticals"]);
  });

  test("desapareció el ciclo de tipos admin/catalogs ⇄ capabilities/registry (el tope bajó a 3)", () => {
    expect(exceptions.maxCiclosDeTipos).toBe(3);
    const out = JSON.parse(execFileSync("node", ["scripts/check-layers.mjs", "--json"], { cwd: ROOT, encoding: "utf8" }));
    expect(out.cycles.valueCycles).toEqual([]);
    expect(JSON.stringify(out.cycles.typeCycles)).not.toContain("capabilities/registry.ts");
  });
});

describe("registro explícito de sectores", () => {
  test("ningún módulo compartido importa una industria; solo runtime puede componerlas", () => {
    const offenders = ls("lib")
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.(test|stories)\./.test(f) && !f.startsWith("lib/industry/") && !f.startsWith("lib/runtime/") && !f.startsWith("lib/construction/"))
      .filter((f) => importsOf(f).some((s: string) => /^@\/lib\/(industry|construction)\b/.test(s)))
      // La experiencia sí puede (regla R1): se excluye lo clasificado como experiencia.
      .filter((f) => classify(f, layers)?.layer !== "experience");
    expect(offenders).toEqual([]);
  });

  test("todo lib/industry/<sector>/sector.ts está registrado en lib/runtime/sectors.ts", () => {
    const declared = ls("lib/industry").filter((f) => /^lib\/industry\/[^/]+\/sector\.ts$/.test(f));
    const runtime = read("lib/runtime/sectors.ts");
    for (const f of declared) {
      const folder = f.split("/")[2];
      expect(runtime, `${folder} no está en runtime/sectors.ts`).toContain(`@/lib/industry/${folder}/sector`);
    }
  });

  test("runtime/sectors.ts es la única pieza que registra sectores y se ejecuta al arrancar y en las pruebas", () => {
    const registrars = ls("lib").filter((f) => /\.(ts|tsx)$/.test(f) && !/\.(test|stories)\./.test(f) && !f.startsWith("lib/core/sectors/")).filter((f) => /\bregisterSector\(/.test(read(f)));
    expect(registrars).toEqual(["lib/runtime/sectors.ts"]);
    expect(read("instrumentation.ts")).toContain("composeSectors()");
    expect(read("vitest.setup.ts")).toContain("composeSectors()");
  });

  test("el registro es solo de servidor y lo documenta", () => {
    expect(read("lib/core/sectors/registry.ts")).toMatch(/Solo servidor/);
  });
});
