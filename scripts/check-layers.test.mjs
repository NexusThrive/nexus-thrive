// Pruebas de las reglas de capas: node --test scripts/check-layers.test.mjs
// No tocan archivos del repo: las pruebas negativas inyectan fuentes virtuales.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { classify, compare, findVerticalLiterals, findViolations, listSources, loadJson, parseImports, resolveImport, ruleFor } from "./check-layers.mjs";

const layers = loadJson("docs/architecture/layers.json");
const exceptions = loadJson("docs/architecture/exceptions.json");
const ROOT = join(import.meta.dirname, "..");
const real = () => Object.fromEntries(listSources().map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));
const realAll = () => Object.fromEntries(listSources(ROOT, ["lib", "app", "components"]).map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));

/** Fuentes reales + archivos virtuales; devuelve los problemas frente a las excepciones reales. */
function problemsWith(extra) {
  const sources = { ...real(), ...extra };
  const { violations, unclassified } = findViolations(sources, layers);
  return compare(violations, unclassified, exceptions, layers, findVerticalLiterals({ ...realAll(), ...extra }));
}

test("el repositorio actual cumple las reglas: todo lo prohibido está en excepciones", () => {
  assert.deepEqual(problemsWith({}), []);
});

test("clasificación: lo más específico gana (gimnasio dentro de lib/business)", () => {
  assert.equal(classify("lib/business/gym-db.ts", layers).layer, "industry");
  assert.equal(classify("lib/business/gym-db.ts", layers).industry, "gym");
  assert.equal(classify("lib/business/customers-db.ts", layers).layer, "business");
  assert.equal(classify("lib/construction/quotes.ts", layers).industry, "construction");
  assert.equal(classify("lib/events/outbox.ts", layers).layer, "core");
});

test("reglas puras", () => {
  const c = (f) => classify(f, layers);
  assert.equal(ruleFor(c("lib/business/customers-db.ts"), c("lib/tenant/context.ts"), layers), null);
  assert.equal(ruleFor(c("lib/construction/quotes.ts"), c("lib/business/customers-db.ts"), layers), null);
  assert.equal(ruleFor(c("lib/construction/quotes.ts"), c("lib/construction/budget.ts"), layers), null);
  assert.equal(ruleFor(c("app/[tenant]/page.tsx"), c("lib/construction/quotes.ts"), layers), null);
  assert.match(ruleFor(c("lib/business/customers-db.ts"), c("lib/construction/quotes.ts"), layers), /^R1/);
  assert.match(ruleFor(c("lib/business/gym-db.ts"), c("lib/construction/shared.ts"), layers), /^R2/);
  assert.match(ruleFor(c("lib/tenant/context.ts"), c("lib/business/customers-db.ts"), layers), /^R3-core-no-importa-business/);
});

test("lee imports estáticos, de tipo, dinámicos y reexportaciones", () => {
  const found = parseImports(`
import { a } from "@/lib/x";
import type { T } from "@/lib/y";
export { b } from "./z";
const m = await import("@/lib/w");
import "side-effect";
`);
  assert.deepEqual(found.map((f) => f.spec), ["@/lib/x", "@/lib/y", "./z", "@/lib/w", "side-effect"]);
  assert.equal(found[1].typeOnly, true);
  assert.equal(found[0].typeOnly, false);
});

test("resuelve alias y rutas relativas, ignora paquetes", () => {
  const exists = (p) => ["lib/a/b.ts", "lib/a/index.ts"].includes(p);
  assert.equal(resolveImport("lib/x/y.ts", "@/lib/a/b", ROOT, exists), "lib/a/b.ts");
  assert.equal(resolveImport("lib/a/c.ts", "./b", ROOT, exists), "lib/a/b.ts");
  assert.equal(resolveImport("lib/x/y.ts", "@/lib/a", ROOT, exists), "lib/a/index.ts");
  assert.equal(resolveImport("lib/x/y.ts", "react", ROOT, exists), null);
});

// ---------------------------------------------------------------------------
// PRUEBAS NEGATIVAS: una dependencia prohibida nueva debe detectarse.
// ---------------------------------------------------------------------------

test("NEGATIVA R1: Business importando una industria es detectado", () => {
  const p = problemsWith({ "lib/business/zz-negativa.ts": `import { createQuotesDb } from "@/lib/construction/quotes";` });
  assert.ok(p.some((m) => m.includes("R1-nadie-importa-industry") && m.includes("lib/business/zz-negativa.ts")), p.join("\n"));
});

test("NEGATIVA R1: Core importando el gimnasio es detectado", () => {
  const p = problemsWith({ "lib/tenant/zz-negativa.ts": `import { x } from "@/lib/business/gym-db";` });
  assert.ok(p.some((m) => m.includes("R1-nadie-importa-industry") && m.includes("lib/tenant/zz-negativa.ts")), p.join("\n"));
});

test("NEGATIVA R2: una industria importando otra es detectado", () => {
  const p = problemsWith({ "lib/construction/zz-negativa.ts": `import { x } from "@/lib/business/gym-db";` });
  assert.ok(p.some((m) => m.includes("R2-industry-no-importa-industry")), p.join("\n"));
});

test("NEGATIVA R3: Core importando Business es detectado (importación relativa)", () => {
  const p = problemsWith({ "lib/auth/zz-negativa.ts": `import { x } from "../business/customers-db";` });
  assert.ok(p.some((m) => m.includes("R3-core-no-importa-business") && m.includes("lib/auth/zz-negativa.ts")), p.join("\n"));
});

test("NEGATIVA R3: Foundation importando Core es detectado", () => {
  const p = problemsWith({ "lib/utils.ts": `${real()["lib/utils.ts"]}\nimport { x } from "@/lib/tenant/context";` });
  assert.ok(p.some((m) => m.includes("R3-foundation-no-importa-core")), p.join("\n"));
});

test("NEGATIVA R4: un rubro nuevo escrito a mano es detectado", () => {
  const p = problemsWith({ "app/zz-negativa/page.tsx": `const x = ctx.vertical === "restaurant" ? 1 : 2;` });
  assert.ok(p.some((m) => m.includes("R4-vertical-literal") && m.includes("app/zz-negativa/page.tsx")), p.join("\n"));
});

test("NEGATIVA: un archivo nuevo sin clasificar es detectado", () => {
  const p = problemsWith({ "lib/zz-carpeta-nueva/a.ts": "export const a = 1;" });
  assert.ok(p.some((m) => m.startsWith("Sin clasificar") && m.includes("lib/zz-carpeta-nueva/a.ts")), p.join("\n"));
});

test("importar hacia abajo no es violación", () => {
  const p = problemsWith({ "lib/business/zz-ok.ts": `import { x } from "@/lib/tenant/context"; import { y } from "@/lib/format";` });
  assert.deepEqual(p, []);
});

// ---------------------------------------------------------------------------
// La lista de excepciones solo puede encogerse.
// ---------------------------------------------------------------------------

test("una excepción que ya no se necesita hace fallar (hay que quitarla)", () => {
  const sources = real();
  delete sources["lib/business/gym-db.ts"]; // desaparece la violación gym-db → construction/shared
  const { violations, unclassified } = findViolations(sources, layers);
  const p = compare(violations, unclassified, exceptions, layers, findVerticalLiterals(realAll()));
  assert.ok(p.some((m) => m.includes("ya no se necesita") && m.includes("gym-db.ts")), p.join("\n"));
});

test("el tope maxAbiertas impide ampliar la lista", () => {
  const extra = { ...exceptions, maxAbiertas: exceptions.maxAbiertas - 1 };
  const { violations, unclassified } = findViolations(real(), layers);
  const p = compare(violations, unclassified, extra, layers, findVerticalLiterals(realAll()));
  assert.ok(p.some((m) => m.includes("tope")), p.join("\n"));
});

test("una excepción sin justificación, etapa o aprobación es inválida", () => {
  const bad = structuredClone(exceptions);
  bad.exceptions[0].justificacion = "";
  bad.exceptions[1].etapa = "  ";
  bad.exceptions[2].aprobacion = "";
  const { violations, unclassified } = findViolations(real(), layers);
  const p = compare(violations, unclassified, bad, layers, findVerticalLiterals(realAll()));
  for (const campo of ["justificacion", "etapa", "aprobacion"]) assert.ok(p.some((m) => m.includes(`«${campo}»`)), campo);
});

test("toda excepción abierta trae origen, destino, regla, justificación, etapa, estado y aprobación", () => {
  for (const e of exceptions.exceptions) {
    for (const k of ["id", "origen", "destino", "regla", "justificacion", "etapa", "estado", "aprobacion"]) {
      assert.ok(String(e[k] ?? "").trim(), `${e.id}: falta ${k}`);
    }
  }
  assert.equal(exceptions.maxAbiertas, exceptions.exceptions.filter((e) => e.estado !== "resuelta").length);
});

test("las 11 comparaciones de rubro están clasificadas y las sectoriales tienen excepción", () => {
  const list = exceptions.comparacionesVertical;
  assert.equal(list.length, 11);
  for (const c of list) assert.ok(["Lógica de negocio", "Configuración", "Navegación", "Presentación", "Prueba"].includes(c.categoria), c.n);
  const sectoriales = list.filter((c) => c.esDependenciaSectorial).length;
  assert.equal(sectoriales, exceptions.exceptions.filter((e) => e.tipo === "vertical-literal").length);
});
