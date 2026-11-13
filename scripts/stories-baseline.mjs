// Storybook es la fuente de verdad de la librería: todo componente de `components/` nace con su historia.
// `uncoveredComponents()` lista los que ninguna historia importa (ni la suya al lado ni otra que los componga).
// Regenera tests/architecture/stories-baseline.json tras escribir historias (la deuda solo puede bajar):
//   node scripts/stories-baseline.mjs
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const walk = (dir) =>
  readdirSync(join(ROOT, dir)).flatMap((n) => {
    const ruta = `${dir}/${n}`;
    if (n === "node_modules" || n.startsWith(".")) return [];
    return statSync(join(ROOT, ruta)).isDirectory() ? walk(ruta) : [ruta];
  });

/** Ruta del repositorio a la que apunta una importación de una historia (o `null` si es un paquete). */
function resolveImport(storyFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = normalize(join(dirname(storyFile), spec));
  else return null;
  for (const candidate of [`${base}.tsx`, `${base}/index.tsx`, base]) {
    if (candidate.endsWith(".tsx") && existsSync(join(ROOT, candidate))) return relative(ROOT, join(ROOT, candidate));
  }
  return null;
}

/** Componentes de `components/` (.tsx, sin historias ni pruebas) que ninguna historia importa, ordenados. */
export function uncoveredComponents() {
  const components = walk("components").filter((f) => f.endsWith(".tsx") && !f.endsWith(".stories.tsx") && !f.includes(".test."));
  const stories = [...walk("components"), ...walk("app")].filter((f) => f.endsWith(".stories.tsx"));
  const covered = new Set();
  for (const story of stories) {
    const source = readFileSync(join(ROOT, story), "utf8");
    for (const [, spec] of source.matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)) {
      const target = resolveImport(story, spec);
      if (target) covered.add(target);
    }
  }
  return components.filter((f) => !covered.has(f) && !existsSync(join(ROOT, f.replace(/\.tsx$/, ".stories.tsx")))).sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = uncoveredComponents();
  writeFileSync(join(ROOT, "tests/architecture/stories-baseline.json"), JSON.stringify(list, null, 2) + "\n");
  console.log(`${list.length} componentes sin historia en la línea base`);
}
