#!/usr/bin/env node
/**
 * Reglas de dependencia entre capas de Nexus (E0).
 *
 * Lee docs/architecture/layers.json (a qué capa pertenece cada carpeta o archivo
 * de lib/) y comprueba los imports de lib/**. Los incumplimientos que ya existían
 * están en docs/architecture/exceptions.json: cada uno con origen, destino,
 * justificación, etapa de resolución y estado. Una excepción nueva, o una que ya
 * no se necesita, hace fallar la comprobación: la lista solo puede encogerse.
 *
 * V10 · M0 amplía lo mismo (no hay una segunda herramienta):
 * - Áreas por ruta: un archivo de `lib/<área>/…` pertenece a esa área aunque no haya una
 *   unidad que lo diga (`areas` en layers.json). Si una unidad lo clasifica distinto, es
 *   una ubicación incoherente y falla.
 * - Ciclos: los de valores (imports estáticos que no son de tipo) están prohibidos; los de
 *   solo tipos tienen un tope (`maxCiclosDeTipos`) que solo puede bajar. Los imports
 *   dinámicos (`import()`) son perezosos y no cuentan como ciclo de carga.
 * - Resultado reproducible: mismas fuentes, misma salida (todo va ordenado, sin fechas).
 *
 * Uso:
 *   node scripts/check-layers.mjs            # comprueba (sale 1 si hay problemas)
 *   node scripts/check-layers.mjs --report   # imprime el resumen del grafo
 *   node scripts/check-layers.mjs --json     # violaciones actuales en JSON
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXTS = [".ts", ".tsx", ".mjs", ".js"];
const SCAN = ["lib"];
const SKIP_FILE = /(\.test\.tsx?|\.integration\.test\.tsx?|\.d\.ts|\.stories\.tsx?)$/;

export function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

/** Lista los .ts/.tsx de las carpetas escaneadas (rutas con "/" relativas a la raíz). */
export function listSources(root = ROOT, dirs = SCAN) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(join(root, rel)).isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(name) && !SKIP_FILE.test(name)) out.push(rel);
    }
  };
  for (const d of dirs) walk(d);
  return out.sort();
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?(?:[^'"`;]*?\sfrom\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

/** Extrae los especificadores de import de un texto fuente. */
export function parseImports(text) {
  const found = [];
  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[2] ?? m[3];
    if (spec) found.push({ spec, typeOnly: Boolean(m[1]), ...(m[3] ? { dynamic: true } : {}) });
  }
  return found;
}

/** Resuelve un especificador a un archivo del repo ("lib/x/y.ts") o null si es un paquete. */
export function resolveImport(fromFile, spec, root = ROOT, exists = (p) => existsSync(join(root, p))) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = join(dirname(fromFile), spec).split(sep).join("/");
  else return null;
  const tries = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => `${base}/index${e}`)];
  for (const t of tries) if (/\.(ts|tsx|mjs|js)$/.test(t) && exists(t)) return t;
  return base; // no existe en disco (p. ej. alias raro): se clasifica por su ruta
}

function matches(pattern, file) {
  if (pattern.endsWith("/")) return file.startsWith(pattern);
  if (pattern.includes("*")) {
    const re = new RegExp("^" + pattern.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*") + "$");
    return re.test(file);
  }
  return file === pattern || file.startsWith(pattern + "/");
}

/**
 * Área que dice la ruta: `lib/<área>/…` con `<área>` en `layers.areas`. En `industry` el sector es la
 * carpeta siguiente (`lib/industry/<sector>/…`). Devuelve null si la ruta no está en un área.
 */
export function areaOf(file, layers) {
  const m = /^lib\/([^/]+)\/(?:([^/]+)\/)?/.exec(file);
  if (!m || !(layers.areas ?? []).includes(m[1])) return null;
  return { layer: m[1], industry: m[1] === "industry" ? (m[2] ?? null) : null };
}

/**
 * Capa de un archivo: gana la unidad más específica (el patrón más largo); sin unidad, la que dice la
 * ruta (`areas`). Si la unidad y la ruta discrepan, el resultado trae `conflict` con la capa de la ruta.
 */
export function classify(file, layers) {
  let best = null;
  for (const u of layers.units) {
    if (matches(u.path, file) && (!best || u.path.length > best.path.length)) best = u;
  }
  const area = areaOf(file, layers);
  if (best) {
    return { layer: best.layer, industry: best.industry ?? null, unit: best.path, ...(area && area.layer !== best.layer ? { conflict: area.layer } : {}) };
  }
  return area ? { layer: area.layer, industry: area.industry, unit: `lib/${area.layer}/`, byPath: true } : null;
}

/** Reglas: devuelve el código de la regla incumplida o null. */
export function ruleFor(from, to, layers) {
  if (from.layer === to.layer && from.layer !== "industry") return null;
  if (from.layer === "industry" && to.layer === "industry") {
    return from.industry === to.industry ? null : "R2-industry-no-importa-industry";
  }
  if (to.layer === "industry" && from.layer !== "experience" && from.layer !== "runtime") return "R1-nadie-importa-industry";
  const allowed = layers.layers[from.layer]?.mayImport ?? [];
  if (!allowed.includes(to.layer)) return `R3-${from.layer}-no-importa-${to.layer}`;
  return null;
}

/**
 * Calcula las violaciones actuales.
 * @param {Record<string,string>} sources  ruta -> texto fuente (inyectable en pruebas)
 */
export function findViolations(sources, layers, { exists } = {}) {
  const unclassified = new Set();
  const conflicts = new Map(); // archivo -> { unit, layer, area }
  const violations = new Map(); // clave origen|destino -> violación
  const files = Object.keys(sources);
  const existsFn = exists ?? ((p) => p in sources || existsSync(join(ROOT, p)));
  for (const file of files) {
    const from = classify(file, layers);
    if (!from) { unclassified.add(file); continue; }
    if (from.conflict) conflicts.set(file, { file, unit: from.unit, layer: from.layer, area: from.conflict });
    for (const { spec, typeOnly } of parseImports(sources[file])) {
      const target = resolveImport(file, spec, ROOT, existsFn);
      if (!target || target === file) continue;
      const to = classify(target, layers);
      if (!to) { if (/^(lib|app|components|prisma)\//.test(target)) unclassified.add(target); continue; }
      const rule = ruleFor(from, to, layers);
      if (!rule) continue;
      const key = `${file}|${target}`;
      const v = violations.get(key) ?? { from: file, to: target, fromLayer: from.layer, toLayer: to.layer, rule, imports: 0, typeOnly: true };
      v.imports += 1;
      v.typeOnly &&= typeOnly;
      violations.set(key, v);
    }
  }
  return { violations: [...violations.values()], unclassified: [...unclassified].sort(), conflicts: [...conflicts.values()].sort((a, b) => a.file.localeCompare(b.file)) };
}

/** Componentes fuertemente conexos con más de un archivo (Tarjan). Devuelve grupos ordenados. */
function cyclesOf(nodes, edges) {
  let index = 0;
  const idx = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const out = [];
  const visit = (v) => {
    idx.set(v, index); low.set(v, index); index += 1;
    stack.push(v); onStack.add(v);
    for (const w of [...(edges.get(v) ?? [])].sort()) {
      if (!idx.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)) {
      const group = [];
      let w;
      do { w = stack.pop(); onStack.delete(w); group.push(w); } while (w !== v);
      if (group.length > 1) out.push(group.sort());
    }
  };
  for (const n of [...nodes].sort()) if (!idx.has(n)) visit(n);
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Ciclos entre archivos de `sources`.
 * - `valueCycles`: por imports estáticos que no son de tipo (rompen la carga): prohibidos.
 * - `typeCycles`: los que solo existen por imports de tipo: tienen tope.
 * Los `import()` dinámicos son perezosos y no entran en ninguno de los dos.
 */
export function findCycles(sources, { exists } = {}) {
  const existsFn = exists ?? ((p) => p in sources || existsSync(join(ROOT, p)));
  const nodes = new Set(Object.keys(sources));
  const valueEdges = new Map();
  const allEdges = new Map();
  const add = (map, a, b) => { if (!map.has(a)) map.set(a, new Set()); map.get(a).add(b); };
  for (const file of nodes) {
    for (const { spec, typeOnly, dynamic } of parseImports(sources[file])) {
      if (dynamic) continue;
      const target = resolveImport(file, spec, ROOT, existsFn);
      if (!target || target === file || !nodes.has(target)) continue;
      add(allEdges, file, target);
      if (!typeOnly) add(valueEdges, file, target);
    }
  }
  const valueCycles = cyclesOf(nodes, valueEdges);
  const inValueCycle = (group) => valueCycles.some((v) => group.every((f) => v.includes(f)));
  const typeCycles = cyclesOf(nodes, allEdges).filter((g) => !inValueCycle(g));
  return { valueCycles, typeCycles };
}

const VERTICAL_LITERAL_RE = /\bvertical\s*(?:===|!==|==|!=)\s*["']([a-z_]+)["']/;

/** R4: comparaciones `vertical === "rubro"` con un rubro escrito a mano (regla F7 del #123). */
export function findVerticalLiterals(sources) {
  const found = [];
  for (const [file, text] of Object.entries(sources)) {
    for (const raw of text.split("\n")) {
      const m = raw.match(VERTICAL_LITERAL_RE);
      if (m) found.push({ file, literal: m[1], linea: raw.trim().replace(/\s+/g, " ") });
    }
  }
  return found;
}

const REQUIRED = ["id", "origen", "destino", "regla", "justificacion", "etapa", "estado", "aprobacion"];

/** Compara violaciones con excepciones. Devuelve la lista de problemas (vacía = todo bien). */
export function compare(violations, unclassified, exceptions, layers, literals = [], extras = {}) {
  const problems = [];
  for (const f of unclassified) problems.push(`Sin clasificar en layers.json: ${f}`);
  for (const c of extras.conflicts ?? []) problems.push(`Ubicación incoherente: ${c.file} está en lib/${c.area}/ pero layers.json (${c.unit}) lo clasifica como ${c.layer}`);
  if (extras.cycles) {
    for (const group of extras.cycles.valueCycles) problems.push(`Ciclo de valores: ${[...group, group[0]].join(" → ")}`);
    const cap = exceptions.maxCiclosDeTipos;
    const n = extras.cycles.typeCycles.length;
    if (typeof cap !== "number") problems.push("exceptions.json necesita «maxCiclosDeTipos»");
    else if (n > cap) problems.push(`Hay ${n} ciclos de solo tipos y el tope es ${cap}: ${extras.cycles.typeCycles.map((g) => g.join(" ⇄ ")).join("; ")}`);
    else if (n < cap) problems.push(`Hay ${n} ciclos de solo tipos y el tope sigue en ${cap}: baja «maxCiclosDeTipos» a ${n} (el tope solo puede bajar)`);
  }
  const list = exceptions.exceptions ?? [];
  const ids = new Set();
  for (const e of list) {
    for (const k of REQUIRED) if (!e[k] || String(e[k]).trim() === "") problems.push(`Excepción ${e.id ?? "(sin id)"}: falta «${k}»`);
    if (ids.has(e.id)) problems.push(`Excepción duplicada: ${e.id}`);
    ids.add(e.id);
  }
  const open = list.filter((e) => e.estado !== "resuelta");
  const keyOf = (o, d) => `${o}|${d}`;
  const imports = open.filter((e) => e.tipo !== "vertical-literal");
  const lits = open.filter((e) => e.tipo === "vertical-literal");
  const byKey = new Map(imports.map((e) => [keyOf(e.origen, e.destino), e]));
  for (const v of violations) {
    const e = byKey.get(keyOf(v.from, v.to));
    if (!e) problems.push(`Dependencia prohibida (${v.rule}): ${v.from} → ${v.to}`);
    else if (e.regla !== v.rule) problems.push(`Excepción ${e.id} cubre ${e.regla} pero la violación es ${v.rule}`);
  }
  const live = new Set(violations.map((v) => keyOf(v.from, v.to)));
  const litKey = (file, literal, linea) => `${file}|${literal}|${linea}`;
  const litExc = new Map(lits.map((e) => [litKey(e.origen, e.destino, e.linea), e]));
  for (const l of literals) {
    if (!litExc.has(litKey(l.file, l.literal, l.linea))) problems.push(`Rubro escrito a mano (R4-vertical-literal): ${l.file} compara con "${l.literal}": ${l.linea}`);
  }
  const liveLit = new Set(literals.map((l) => litKey(l.file, l.literal, l.linea)));
  for (const e of lits) {
    if (!liveLit.has(litKey(e.origen, e.destino, e.linea))) problems.push(`Excepción ${e.id} ya no se necesita: márcala «resuelta» y quítala (${e.origen}: ${e.linea})`);
  }
  for (const e of imports) {
    if (!live.has(keyOf(e.origen, e.destino))) problems.push(`Excepción ${e.id} ya no se necesita: márcala «resuelta» y quítala (${e.origen} → ${e.destino})`);
  }
  const cap = exceptions.maxAbiertas;
  if (typeof cap !== "number") problems.push("exceptions.json necesita «maxAbiertas»");
  else if (open.length > cap) problems.push(`Hay ${open.length} excepciones abiertas y el tope es ${cap}: la lista no puede crecer sin aprobación`);
  return problems;
}

function main() {
  const layers = loadJson("docs/architecture/layers.json");
  const exceptions = loadJson("docs/architecture/exceptions.json");
  const read = (list) => Object.fromEntries(list.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));
  const sources = read(listSources());
  const literals = findVerticalLiterals(read(listSources(ROOT, ["lib", "app", "components"])));
  const { violations, unclassified, conflicts } = findViolations(sources, layers);
  const cycles = findCycles(sources);
  if (process.argv.includes("--json")) { console.log(JSON.stringify({ violations, unclassified, conflicts, cycles, literals }, null, 1)); return; }
  if (process.argv.includes("--report")) {
    const by = {};
    for (const v of violations) by[v.rule] = (by[v.rule] ?? 0) + 1;
    console.log(`archivos: ${Object.keys(sources).length} | violaciones (archivo→archivo): ${violations.length} | sin clasificar: ${unclassified.length} | ubicaciones incoherentes: ${conflicts.length}`);
    console.log(by);
    // Dependencias entre capas (archivo→archivo, todas las permitidas): ayuda a ver hacia dónde apunta cada capa.
    const matrix = {};
    for (const [file, text] of Object.entries(sources)) {
      const from = classify(file, layers);
      if (!from) continue;
      for (const { spec } of parseImports(text)) {
        const target = resolveImport(file, spec, ROOT, (p) => p in sources || existsSync(join(ROOT, p)));
        const to = target && classify(target, layers);
        if (!to || to.layer === from.layer) continue;
        const key = `${from.layer} → ${to.layer}`;
        matrix[key] = (matrix[key] ?? 0) + 1;
      }
    }
    console.log(Object.fromEntries(Object.entries(matrix).sort(([a], [b]) => a.localeCompare(b))));
    console.log(`ciclos de valores: ${cycles.valueCycles.length} | ciclos de solo tipos: ${cycles.typeCycles.length}`);
    for (const g of cycles.typeCycles) console.log("  tipos: " + g.join(" ⇄ "));
    return;
  }
  const problems = compare(violations, unclassified, exceptions, layers, literals, { conflicts, cycles });
  const open = (exceptions.exceptions ?? []).filter((e) => e.estado !== "resuelta").length;
  if (problems.length) {
    console.error(`✗ Reglas de capas: ${problems.length} problema(s)\n` + problems.map((p) => "  - " + p).join("\n"));
    process.exit(1);
  }
  console.log(`✓ Reglas de capas: ${Object.keys(sources).length} archivos, ${violations.length} dependencias y ${literals.length} rubros escritos a mano cubiertos por excepciones abiertas (${open}, tope ${exceptions.maxAbiertas}); 0 nuevas; ${cycles.valueCycles.length} ciclos de valores y ${cycles.typeCycles.length} de solo tipos (tope ${exceptions.maxCiclosDeTipos}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
