// Progreso de la guía de capas (.docs/capas): cuenta las casillas de
// "Funcionalidad" de cada subcapa (`- [x]` hecho, `- [ ]` pendiente).
//
//   node scripts/capas-progreso.mjs           imprime la tabla
//   node scripts/capas-progreso.mjs --write   la escribe en .docs/README.md y
//                                             .docs/capas/README.md, entre
//                                             <!-- progreso:inicio --> y <!-- progreso:fin -->

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const capasDir = join(root, ".docs/capas");
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

function countSubcapa(path) {
  const levels = {};
  let level = null;
  let section = null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const lv = line.match(/^## (N\d)/);
    if (lv) level = lv[1];
    if (line.startsWith("#### ")) section = line.slice(5).trim();
    const box = line.match(/^- \[( |x)\] /);
    if (box && section === "Funcionalidad" && level) {
      levels[level] ??= { done: 0, total: 0 };
      levels[level].total++;
      if (box[1] === "x") levels[level].done++;
    }
  }
  return levels;
}

const capas = readdirSync(capasDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const id = d.name.split("-")[0];
    const title = readFileSync(join(capasDir, d.name, "README.md"), "utf8").match(/^titulo: "(.+)"$/m)?.[1] ?? d.name;
    const total = { done: 0, total: 0 };
    const n1 = { done: 0, total: 0 };
    for (const sub of readdirSync(join(capasDir, d.name), { withFileTypes: true })) {
      const readme = join(capasDir, d.name, sub.name, "README.md");
      if (!sub.isDirectory() || !existsSync(readme)) continue;
      for (const [lv, c] of Object.entries(countSubcapa(readme))) {
        total.done += c.done;
        total.total += c.total;
        if (lv === "N1") {
          n1.done += c.done;
          n1.total += c.total;
        }
      }
    }
    return { id, dir: d.name, title, total, n1 };
  })
  .sort((a, b) => ROMAN.indexOf(a.id) - ROMAN.indexOf(b.id));

const pct = (c) => (c.total ? `${Math.round((c.done / c.total) * 100)} %` : "—");
const bar = (c) => {
  if (!c.total) return "";
  const filled = Math.round((c.done / c.total) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
};

function table(linkPrefix) {
  const rows = capas.map(
    (c) =>
      `| ${c.id} | [${c.title}](${linkPrefix}${c.dir}/README.md) | ${c.n1.done}/${c.n1.total} · ${pct(c.n1)} | ${c.total.done}/${c.total.total} · ${pct(c.total)} | \`${bar(c.total)}\` |`,
  );
  const all = capas.reduce(
    (a, c) => ({ done: a.done + c.total.done, total: a.total + c.total.total, n1d: a.n1d + c.n1.done, n1t: a.n1t + c.n1.total }),
    { done: 0, total: 0, n1d: 0, n1t: 0 },
  );
  return [
    "| Capa | Nombre | Nivel N1 (lo básico) | Todas las funcionalidades | |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    `| | **Total** | **${all.n1d}/${all.n1t} · ${pct({ done: all.n1d, total: all.n1t })}** | **${all.done}/${all.total} · ${pct(all)}** | |`,
    "",
    "_Generado con `node scripts/capas-progreso.mjs --write`. La capa XI (construcción) usa pestañas en lugar de casillas: su estado está en su README._",
  ].join("\n");
}

const START = "<!-- progreso:inicio -->";
const END = "<!-- progreso:fin -->";

if (process.argv.includes("--write")) {
  for (const [file, prefix] of [
    [join(root, ".docs/README.md"), "capas/"],
    [join(capasDir, "README.md"), ""],
  ]) {
    const text = readFileSync(file, "utf8");
    const i = text.indexOf(START);
    const j = text.indexOf(END);
    if (i < 0 || j < 0) throw new Error(`${file}: faltan los marcadores ${START} … ${END}`);
    writeFileSync(file, `${text.slice(0, i + START.length)}\n${table(prefix)}\n${text.slice(j)}`);
    console.log(`Actualizado ${file}`);
  }
} else {
  console.log(table("capas/"));
}
