#!/usr/bin/env node
// Inventario medible del sistema de diseño: uso de componentes, patrones en app/, cobertura de rutas, escala tipográfica
// y taxonomía de Storybook. Es de solo lectura. Las cifras de `packages/brand/docs/03-sistema/inventario-patrones.md` salen de aquí.
//
//   node scripts/design-inventory.mjs            imprime las tablas
//   node scripts/design-inventory.mjs --json     imprime el resultado como JSON
//
// Heurístico: cuenta texto, no analiza el árbol de sintaxis. Sirve para ver tendencias y brechas, no para sancionar.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const walk = (dir) =>
  existsSync(join(ROOT, dir))
    ? readdirSync(join(ROOT, dir)).flatMap((n) => {
        const p = `${dir}/${n}`;
        return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
      })
    : [];
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const isCode = (f) => /\.tsx?$/.test(f) && !/\.(stories|test)\./.test(f);

const appFiles = walk("app").filter(isCode);
const compFiles = walk("components").filter((f) => isCode(f) && !f.includes("/labs/"));
const text = new Map([...appFiles, ...compFiles, ...walk("lib").filter(isCode)].map((f) => [f, read(f)]));
const count = (rx, files) => {
  const r = new RegExp(rx, "g");
  let uses = 0;
  let nfiles = 0;
  for (const f of files) {
    const k = (text.get(f)?.match(r) ?? []).length;
    uses += k;
    nfiles += k > 0 ? 1 : 0;
  }
  return { usos: uses, archivos: nfiles };
};

// 1. Uso de componentes compartidos
const componentes = {};
for (const capa of ["atoms", "molecules", "organisms", "templates"]) {
  // Solo archivos de primer nivel de cada capa: los de subcarpetas (charts, onboarding, pricing) se importan con otra ruta.
  const lista = walk(`components/${capa}`).filter((f) => isCode(f) && f.split("/").length === 3);
  componentes[capa] = lista.map((f) => {
    const nombre = basename(f).replace(/\.tsx?$/, "");
    const imp = new RegExp(`from\\s+["']@/components/${capa}/${nombre}["']`);
    const rel = new RegExp(`from\\s+["']\\./${nombre}["']`);
    const usos = [...text].filter(([g, t]) => g !== f && (imp.test(t) || (dirname(g) === dirname(f) && rel.test(t)))).length;
    const historia = existsSync(join(ROOT, f.replace(/\.tsx?$/, ".stories.tsx")));
    return { nombre, usos, historia };
  });
}

// 2. Patrones en app/
const patrones = Object.fromEntries(
  Object.entries({
    "tabla nativa <table": ["<table\\b", appFiles],
    "DataTable": ["<DataTable\\b", appFiles],
    "<button nativo": ["<button\\b", appFiles],
    "Button compartido": ["<Button\\b", appFiles],
    "buttonVariants (cva)": ["buttonVariants", appFiles],
    "Field": ["<Field\\b", appFiles],
    "Select propio": ["<Select\\b", appFiles],
    "<select nativo": ["<select\\b", appFiles],
    "EmptyState": ["<EmptyState\\b", appFiles],
    "Alert": ["<Alert\\b", appFiles],
    "useToast": ["useToast\\(", appFiles],
    "ResponsiveSheet": ["<ResponsiveSheet\\b", appFiles],
    "FormDialog/FormDrawer": ["<Form(Dialog|Drawer)\\b", appFiles],
    "ConfirmDialog/useConfirm": ["useConfirm\\(|<ConfirmDialog\\b", appFiles],
    "window.confirm/alert": ["window\\.(confirm|alert)\\(", appFiles],
    "LoadingState": ["<LoadingState\\b", appFiles],
    "SkeletonRows/Skeleton": ["<SkeletonRows\\b|<Skeleton\\b", appFiles],
    "hex literal": ["#[0-9a-fA-F]{6}\\b|#[0-9a-fA-F]{3}\\b", appFiles],
    "color arbitrario Tailwind": ["\\[#[0-9a-fA-F]+\\]", [...appFiles, ...compFiles]],
    "z-index numérico": ["z-\\[\\d+\\]|\\bz-\\d+\\b|zIndex", [...appFiles, ...compFiles]],
    "px arbitrario en texto": ["text-\\[[0-9.]+px\\]", [...appFiles, ...compFiles]],
  }).map(([k, [rx, files]]) => [k, count(rx, files)]),
);

// 3. Escala tipográfica realmente usada
const escala = {};
for (const f of [...appFiles, ...compFiles]) for (const m of text.get(f).matchAll(/\btext-(?:xs|sm|base|lg|xl|2xl|3xl|\[[0-9.]+px\])(?![\w-])/g)) escala[m[0]] = (escala[m[0]] ?? 0) + 1;

// 4. Cobertura de rutas
const rutas = { page: 0, loading: 0, error: 0, "not-found": 0 };
for (const f of walk("app")) {
  const n = basename(f);
  if (n === "page.tsx") rutas.page++;
  else if (n === "loading.tsx") rutas.loading++;
  else if (n === "error.tsx") rutas.error++;
  else if (n === "not-found.tsx") rutas["not-found"]++;
}

// 5. Storybook
const historias = [...walk("components"), ...walk("app")].filter((f) => f.endsWith(".stories.tsx"));
const grupos = {};
for (const f of historias) {
  const m = read(f).match(/(?:const meta|export default)[^{]*\{[^}]*?title:\s*["']([^"']+)["']/s);
  const g = (m?.[1] ?? "SIN TÍTULO").split("/")[0];
  grupos[g] = (grupos[g] ?? 0) + 1;
}

const resultado = {
  componentes: Object.fromEntries(
    Object.entries(componentes).map(([capa, l]) => [
      capa,
      { total: l.length, sinHistoria: l.filter((c) => !c.historia).map((c) => c.nombre), sinUso: l.filter((c) => c.usos === 0).map((c) => c.nombre), unSoloUso: l.filter((c) => c.usos === 1).length },
    ]),
  ),
  patrones,
  escala: Object.fromEntries(Object.entries(escala).sort((a, b) => b[1] - a[1])),
  rutas,
  storybook: { archivos: historias.length, grupos },
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(resultado, null, 2));
} else {
  console.log("== Componentes compartidos");
  for (const [capa, r] of Object.entries(resultado.componentes)) console.log(`${capa.padEnd(11)} total ${r.total} · sin historia ${r.sinHistoria.length} · sin uso ${r.sinUso.length} · un solo uso ${r.unSoloUso}`);
  console.log("\n== Patrones en app/ (usos / archivos)");
  for (const [k, v] of Object.entries(patrones)) console.log(`${k.padEnd(30)}${String(v.usos).padStart(6)}${String(v.archivos).padStart(8)}`);
  console.log("\n== Escala tipográfica usada");
  console.log(Object.entries(resultado.escala).slice(0, 14).map(([k, v]) => `${k}:${v}`).join("  "));
  console.log("\n== Rutas", JSON.stringify(rutas));
  console.log("== Storybook", JSON.stringify(resultado.storybook));
}
