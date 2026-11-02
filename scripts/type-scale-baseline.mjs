// Regenera tests/architecture/type-scale-baseline.json: usos de `text-[Npx]` por archivo (app/ y components/, sin historias).
// Se ejecuta tras migrar un archivo a la escala (la deuda solo puede bajar): node scripts/type-scale-baseline.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const walk = (dir) =>
  readdirSync(join(root, dir)).flatMap((n) => {
    const ruta = `${dir}/${n}`;
    if (n === "node_modules" || n.startsWith(".")) return [];
    return statSync(join(root, ruta)).isDirectory() ? walk(ruta) : [ruta];
  });
const out = {};
for (const f of [...walk("app"), ...walk("components")].filter((f) => f.endsWith(".tsx") && !f.endsWith(".stories.tsx"))) {
  const n = (readFileSync(join(root, f), "utf8").match(/text-\[\d+(\.\d+)?px\]/g) ?? []).length;
  if (n > 0) out[f] = n;
}
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(root, "tests/architecture/type-scale-baseline.json"), JSON.stringify(sorted, null, 2) + "\n");
console.log(`${Object.keys(sorted).length} archivos, ${Object.values(sorted).reduce((a, b) => a + b, 0)} usos`);
