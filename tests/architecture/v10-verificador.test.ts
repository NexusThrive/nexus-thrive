/**
 * V10 · M0 — El verificador arquitectónico entiende áreas por ruta, ciclos y resultados reproducibles.
 *
 * Es el mismo `scripts/check-layers.mjs` de E0 (no hay una segunda herramienta). Estas pruebas fijan lo que M0 añade:
 * áreas derivadas de la ruta, ubicaciones incoherentes, ciclos de valores prohibidos, tope de ciclos de tipos que solo baja,
 * `runtime` como único que puede componer industrias, cero excepciones y salida idéntica entre ejecuciones.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore el verificador es un .mjs sin tipos
import { areaOf, classify, compare, findCycles, findOrphanUnits, findViolations, loadJson, parseImports, ruleFor } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const layers = loadJson("docs/architecture/layers.json");
const exceptions = loadJson("docs/architecture/exceptions.json");
const c = (file: string) => classify(file, layers);

/** Capas mínimas para probar sin depender del contenido real de layers.json. */
const mini = {
  areas: ["foundation", "core", "business", "industry", "runtime"],
  layers: {
    foundation: { mayImport: [] },
    core: { mayImport: ["foundation"] },
    business: { mayImport: ["foundation", "core"] },
    industry: { mayImport: ["foundation", "core", "business"] },
    runtime: { mayImport: ["foundation", "core", "business", "industry"] },
  },
  units: [{ path: "lib/legacy", layer: "business" }],
};

describe("áreas derivadas de la ruta", () => {
  test("un archivo de lib/<área>/… pertenece a esa área sin necesitar una unidad", () => {
    expect(classify("lib/core/sectors/registry.ts", mini)).toMatchObject({ layer: "core", byPath: true });
    expect(classify("lib/foundation/db/transaction.ts", mini)?.layer).toBe("foundation");
  });

  test("en industry, el sector es la carpeta siguiente", () => {
    expect(areaOf("lib/industry/restaurant/sector.ts", mini)).toEqual({ layer: "industry", industry: "restaurant" });
    expect(areaOf("lib/industry/loose.ts", mini)).toEqual({ layer: "industry", industry: null });
  });

  test("una carpeta que no es un área no se clasifica por ruta", () => {
    expect(classify("lib/otra/x.ts", mini)).toBeNull();
    expect(areaOf("app/core/x.ts", mini)).toBeNull();
  });

  test("una unidad explícita gana a la ruta, y si discrepan queda marcado como incoherente", () => {
    const withConflict = { ...mini, units: [{ path: "lib/core/raro.ts", layer: "business" }] };
    expect(classify("lib/core/raro.ts", withConflict)).toMatchObject({ layer: "business", conflict: "core" });
    const { conflicts } = findViolations({ "lib/core/raro.ts": "" }, withConflict);
    expect(conflicts).toEqual([{ file: "lib/core/raro.ts", unit: "lib/core/raro.ts", layer: "business", area: "core" }]);
    const problems = compare([], [], { exceptions: [], maxAbiertas: 0, maxCiclosDeTipos: 0 }, withConflict, [], { conflicts, cycles: { valueCycles: [], typeCycles: [] } });
    expect(problems.some((p: string) => p.includes("Ubicación incoherente") && p.includes("lib/core/raro.ts"))).toBe(true);
  });

  test("las reglas de dependencia se aplican a los archivos clasificados por ruta", () => {
    const sources = { "lib/core/a.ts": 'import { x } from "@/lib/business/b";', "lib/business/b.ts": "export const x = 1;" };
    const { violations } = findViolations(sources, mini);
    expect(violations.map((v: { rule: string }) => v.rule)).toEqual(["R3-core-no-importa-business"]);
  });
});

describe("dependencias entre áreas", () => {
  test("solo runtime y experience pueden importar una industria", () => {
    expect(ruleFor({ layer: "runtime" }, { layer: "industry", industry: "gym" }, layers)).toBeNull();
    expect(ruleFor({ layer: "experience" }, { layer: "industry", industry: "gym" }, layers)).toBeNull();
    for (const from of ["foundation", "core", "business", "finance", "integrations", "platform"]) {
      expect(ruleFor({ layer: from }, { layer: "industry", industry: "gym" }, layers), from).toMatch(/^R1/);
    }
  });

  test("nadie importa runtime salvo runtime mismo", () => {
    for (const from of Object.keys(layers.layers).filter((l) => l !== "runtime")) {
      expect(layers.layers[from].mayImport, from).not.toContain("runtime");
    }
  });

  test("layers.json es coherente: cada área es una capa, ninguna capa se lista a sí misma y toda referencia existe", () => {
    for (const area of layers.areas) expect(layers.layers[area], area).toBeDefined();
    for (const [name, def] of Object.entries(layers.layers) as [string, { mayImport: string[] }][]) {
      expect(def.mayImport, name).not.toContain(name);
      for (const target of def.mayImport) expect(layers.layers[target], `${name} → ${target}`).toBeDefined();
    }
  });

  test("los archivos reales están donde dice su ruta (ninguna ubicación incoherente)", () => {
    expect(c("lib/runtime/ports.ts")?.layer).toBe("runtime");
    expect(c("lib/business/sales/money-service.ts")?.layer).toBe("business");
    expect(c("lib/industry/gym/gym-db.ts")).toMatchObject({ layer: "industry", industry: "gym" });
  });
});

describe("ciclos", () => {
  const files = (o: Record<string, string>) => o;

  test("un ciclo de valores se detecta y se prohíbe", () => {
    const { valueCycles, typeCycles } = findCycles(files({ "lib/a.ts": 'import { b } from "./b";', "lib/b.ts": 'import { a } from "./a";' }));
    expect(valueCycles).toEqual([["lib/a.ts", "lib/b.ts"]]);
    expect(typeCycles).toEqual([]);
    const problems = compare([], [], { exceptions: [], maxAbiertas: 0, maxCiclosDeTipos: 0 }, mini, [], { cycles: { valueCycles, typeCycles } });
    expect(problems.some((p: string) => p.startsWith("Ciclo de valores: lib/a.ts → lib/b.ts → lib/a.ts"))).toBe(true);
  });

  test("un ciclo que solo existe por imports de tipo no es de valores y cuenta contra el tope", () => {
    const { valueCycles, typeCycles } = findCycles(files({ "lib/a.ts": 'import type { B } from "./b";', "lib/b.ts": 'import { a } from "./a";' }));
    expect(valueCycles).toEqual([]);
    expect(typeCycles).toEqual([["lib/a.ts", "lib/b.ts"]]);
  });

  test("un import dinámico es perezoso: no forma ciclo de carga", () => {
    const { valueCycles, typeCycles } = findCycles(files({ "lib/a.ts": 'const m = await import("./b");', "lib/b.ts": 'import { a } from "./a";' }));
    expect(valueCycles).toEqual([]);
    expect(typeCycles).toEqual([]);
    expect(parseImports('const m = await import("./b");')[0]).toMatchObject({ spec: "./b", dynamic: true });
  });

  test("una cadena sin retorno no es un ciclo, ni un archivo que se importa a sí mismo", () => {
    const r = findCycles(files({ "lib/a.ts": 'import { b } from "./b"; import { a } from "./a";', "lib/b.ts": 'import { c } from "./c";', "lib/c.ts": "" }));
    expect(r).toEqual({ valueCycles: [], typeCycles: [] });
  });

  test("el tope de ciclos de tipos no puede subir ni quedarse alto: solo baja", () => {
    const cycles = { valueCycles: [], typeCycles: [["lib/a.ts", "lib/b.ts"]] };
    const run = (cap: number) => compare([], [], { exceptions: [], maxAbiertas: 0, maxCiclosDeTipos: cap }, mini, [], { cycles });
    expect(run(1)).toEqual([]);
    expect(run(0).some((p: string) => p.includes("tope es 0"))).toBe(true);
    expect(run(2).some((p: string) => p.includes("baja «maxCiclosDeTipos» a 1"))).toBe(true);
  });

  test("el repositorio no tiene ciclos de valores y su tope de ciclos de tipos es exacto", () => {
    const out = JSON.parse(execFileSync("node", ["scripts/check-layers.mjs", "--json"], { cwd: ROOT, encoding: "utf8" }));
    expect(out.cycles.valueCycles).toEqual([]);
    expect(out.cycles.typeCycles).toHaveLength(exceptions.maxCiclosDeTipos);
  });
});

describe("cero excepciones y resultados reproducibles", () => {
  test("el tope de excepciones abiertas es 0 y no hay ninguna: subirlo exige cambiar esta prueba a propósito", () => {
    expect(exceptions.maxAbiertas).toBe(0);
    expect(exceptions.exceptions.filter((e: { estado: string }) => e.estado !== "resuelta")).toEqual([]);
  });

  test("dos ejecuciones dan exactamente la misma salida (JSON y reporte)", () => {
    const run = (flag: string) => execFileSync("node", ["scripts/check-layers.mjs", flag], { cwd: ROOT, encoding: "utf8" });
    expect(run("--json")).toBe(run("--json"));
    expect(run("--report")).toBe(run("--report"));
  });

  test("el verificador no modifica el código: no escribe archivos", () => {
    const source = execFileSync("cat", ["scripts/check-layers.mjs"], { cwd: ROOT, encoding: "utf8" });
    expect(source).not.toMatch(/writeFile|appendFile|unlink|rmSync|renameSync|execSync|spawn/);
  });
});

describe("unidades huérfanas de layers.json (V10 · M3, P-10)", () => {
  const units = { units: [{ path: "lib/business", layer: "business" }, { path: "lib/vieja.ts", layer: "core" }, { path: "lib/otra/", layer: "core" }, { path: "lib/*-db.ts", layer: "core" }] };
  const exists = (p: string) => ["lib/business", "lib/otra"].includes(p);

  test("una unidad que apunta a algo que ya no existe se detecta (los patrones con * no se comprueban)", () => {
    expect(findOrphanUnits(units, exists)).toEqual(["lib/vieja.ts"]);
  });

  test("una unidad huérfana hace fallar la comprobación", () => {
    const problems = compare([], [], { exceptions: [], maxAbiertas: 0, maxCiclosDeTipos: 0 }, mini, [], { orphans: ["lib/vieja.ts"], cycles: { valueCycles: [], typeCycles: [] } });
    expect(problems.some((p: string) => p.includes("sin archivos") && p.includes("lib/vieja.ts"))).toBe(true);
  });

  test("el layers.json real no tiene unidades huérfanas", () => {
    expect(findOrphanUnits(layers)).toEqual([]);
  });
});
