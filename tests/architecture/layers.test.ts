/**
 * Reglas de dependencia entre capas (E0). Comprueba scripts/check-layers.mjs y,
 * con el último caso, que el repositorio actual las cumple. No toca archivos:
 * las pruebas negativas inyectan fuentes virtuales.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  classify,
  compare,
  findVerticalLiterals,
  findViolations,
  listSources,
  loadJson,
  parseImports,
  resolveImport,
  ruleFor,
} from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const layers = loadJson("docs/architecture/layers.json");
const exceptions = loadJson("docs/architecture/exceptions.json");

const read = (files: string[]): Record<string, string> => Object.fromEntries(files.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));
const libSources = () => read(listSources());
const allSources = () => read(listSources(ROOT, ["lib", "app", "components"]));

/** Fuentes reales más archivos virtuales; devuelve los problemas frente a las excepciones reales. */
function problemsWith(extra: Record<string, string>, excs = exceptions): string[] {
  const { violations, unclassified } = findViolations({ ...libSources(), ...extra }, layers);
  return compare(violations, unclassified, excs, layers, findVerticalLiterals({ ...allSources(), ...extra }));
}

describe("clasificación y reglas", () => {
  test("gana la unidad más específica (el gimnasio dentro de lib/business)", () => {
    expect(classify("lib/industry/gym/gym-db.ts", layers)).toMatchObject({ layer: "industry", industry: "gym" });
    expect(classify("lib/industry/museum/museum-db.ts", layers)).toMatchObject({ layer: "industry", industry: "museum" });
    expect(classify("lib/business/customers-db.ts", layers)?.layer).toBe("business");
    expect(classify("lib/construction/quotes.ts", layers)?.industry).toBe("construction");
    expect(classify("lib/events/outbox.ts", layers)?.layer).toBe("core");
  });

  test("importar hacia abajo o dentro de la misma capa está permitido", () => {
    const c = (f: string) => classify(f, layers);
    expect(ruleFor(c("lib/business/customers-db.ts"), c("lib/tenant/context.ts"), layers)).toBeNull();
    expect(ruleFor(c("lib/construction/quotes.ts"), c("lib/business/customers-db.ts"), layers)).toBeNull();
    expect(ruleFor(c("lib/construction/quotes.ts"), c("lib/construction/budget.ts"), layers)).toBeNull();
    expect(ruleFor(c("app/[tenant]/page.tsx"), c("lib/construction/quotes.ts"), layers)).toBeNull();
  });

  test("devuelve la regla incumplida", () => {
    const c = (f: string) => classify(f, layers);
    expect(ruleFor(c("lib/business/customers-db.ts"), c("lib/construction/quotes.ts"), layers)).toMatch(/^R1/);
    expect(ruleFor(c("lib/industry/gym/gym-db.ts"), c("lib/construction/shared.ts"), layers)).toMatch(/^R2/);
    expect(ruleFor(c("lib/tenant/context.ts"), c("lib/business/customers-db.ts"), layers)).toBe("R3-core-no-importa-business");
  });
});

describe("lectura de imports", () => {
  test("estáticos, de tipo, dinámicos y reexportaciones", () => {
    const found = parseImports(`
import { a } from "@/lib/x";
import type { T } from "@/lib/y";
export { b } from "./z";
const m = await import("@/lib/w");
import "side-effect";
`);
    expect(found.map((f: { spec: string }) => f.spec)).toEqual(["@/lib/x", "@/lib/y", "./z", "@/lib/w", "side-effect"]);
    expect(found[0].typeOnly).toBe(false);
    expect(found[1].typeOnly).toBe(true);
  });

  test("resuelve alias y rutas relativas e ignora paquetes", () => {
    const exists = (p: string) => ["lib/a/b.ts", "lib/a/index.ts"].includes(p);
    expect(resolveImport("lib/x/y.ts", "@/lib/a/b", ROOT, exists)).toBe("lib/a/b.ts");
    expect(resolveImport("lib/a/c.ts", "./b", ROOT, exists)).toBe("lib/a/b.ts");
    expect(resolveImport("lib/x/y.ts", "@/lib/a", ROOT, exists)).toBe("lib/a/index.ts");
    expect(resolveImport("lib/x/y.ts", "react", ROOT, exists)).toBeNull();
  });
});

describe("pruebas negativas: una dependencia prohibida nueva se detecta", () => {
  test("R1: Business importando una industria", () => {
    const p = problemsWith({ "lib/business/zz-negativa.ts": `import { createQuotesDb } from "@/lib/construction/quotes";` });
    expect(p.some((m) => m.includes("R1-nadie-importa-industry") && m.includes("lib/business/zz-negativa.ts"))).toBe(true);
  });

  test("R1: Core importando el gimnasio", () => {
    const p = problemsWith({ "lib/tenant/zz-negativa.ts": `import { x } from "@/lib/industry/gym/gym-db";` });
    expect(p.some((m) => m.includes("R1-nadie-importa-industry") && m.includes("lib/tenant/zz-negativa.ts"))).toBe(true);
  });

  test("R2: una industria importando otra", () => {
    const p = problemsWith({ "lib/construction/zz-negativa.ts": `import { x } from "@/lib/industry/gym/gym-db";` });
    expect(p.some((m) => m.includes("R2-industry-no-importa-industry"))).toBe(true);
  });

  test("R3: Core importando Business con ruta relativa", () => {
    const p = problemsWith({ "lib/auth/zz-negativa.ts": `import { x } from "../business/customers-db";` });
    expect(p.some((m) => m.includes("R3-core-no-importa-business") && m.includes("lib/auth/zz-negativa.ts"))).toBe(true);
  });

  test("R3: Foundation importando Core", () => {
    const utils = libSources()["lib/utils.ts"];
    const p = problemsWith({ "lib/utils.ts": `${utils}\nimport { x } from "@/lib/tenant/context";` });
    expect(p.some((m) => m.includes("R3-foundation-no-importa-core"))).toBe(true);
  });

  test("R4: un rubro nuevo escrito a mano", () => {
    const p = problemsWith({ "app/zz-negativa/page.tsx": `const x = ctx.vertical === "restaurant" ? 1 : 2;` });
    expect(p.some((m) => m.includes("R4-vertical-literal") && m.includes("app/zz-negativa/page.tsx"))).toBe(true);
  });

  test("un archivo nuevo sin clasificar", () => {
    const p = problemsWith({ "lib/zz-carpeta-nueva/a.ts": "export const a = 1;" });
    expect(p.some((m) => m.startsWith("Sin clasificar") && m.includes("lib/zz-carpeta-nueva/a.ts"))).toBe(true);
  });

  test("un import hacia abajo no genera problemas", () => {
    expect(problemsWith({ "lib/business/zz-ok.ts": `import { x } from "@/lib/tenant/context"; import { y } from "@/lib/format";` })).toEqual([]);
  });
});

describe("la lista de excepciones solo puede encogerse", () => {
  test("una excepción que ya no se necesita hace fallar", () => {
    // Se toma cualquier excepción abierta de import y se quita su archivo de origen:
    // la violación desaparece y la excepción sobra.
    const open = exceptions.exceptions.find((e: { tipo: string; estado: string }) => e.tipo === "import" && e.estado !== "resuelta");
    const sources = libSources();
    delete sources[open.origen];
    const { violations, unclassified } = findViolations(sources, layers);
    const p = compare(violations, unclassified, exceptions, layers, findVerticalLiterals(allSources()));
    expect(p.some((m) => m.includes("ya no se necesita") && m.includes(open.origen))).toBe(true);
  });

  test("maxAbiertas impide ampliar la lista", () => {
    const p = problemsWith({}, { ...exceptions, maxAbiertas: exceptions.maxAbiertas - 1 });
    expect(p.some((m) => m.includes("tope"))).toBe(true);
  });

  test("una excepción sin justificación, etapa o aprobación es inválida", () => {
    const bad = structuredClone(exceptions);
    bad.exceptions[0].justificacion = "";
    bad.exceptions[1].etapa = "  ";
    bad.exceptions[2].aprobacion = "";
    const p = problemsWith({}, bad);
    for (const campo of ["justificacion", "etapa", "aprobacion"]) expect(p.some((m) => m.includes(`«${campo}»`))).toBe(true);
  });

  test("toda excepción trae origen, destino, regla, justificación, etapa, estado y aprobación", () => {
    for (const e of exceptions.exceptions) {
      for (const k of ["id", "origen", "destino", "regla", "justificacion", "etapa", "estado", "aprobacion"]) {
        expect(String(e[k] ?? "").trim(), `${e.id}: falta ${k}`).not.toBe("");
      }
    }
    expect(exceptions.maxAbiertas).toBe(exceptions.exceptions.filter((e: { estado: string }) => e.estado !== "resuelta").length);
  });

  test("las 11 comparaciones de rubro están clasificadas y las sectoriales tienen excepción", () => {
    const list = exceptions.comparacionesVertical;
    expect(list).toHaveLength(11);
    for (const c of list) expect(["Lógica de negocio", "Configuración", "Navegación", "Presentación", "Prueba"]).toContain(c.categoria);
    const sectoriales = list.filter((c: { esDependenciaSectorial: boolean }) => c.esDependenciaSectorial).length;
    expect(sectoriales).toBe(exceptions.exceptions.filter((e: { tipo: string }) => e.tipo === "vertical-literal").length);
  });
});

test("el repositorio actual cumple las reglas: todo lo prohibido está en excepciones", () => {
  expect(problemsWith({})).toEqual([]);
});
