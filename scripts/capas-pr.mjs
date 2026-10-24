// Genera, desde las casillas de .docs/capas marcadas `_(PR-NN)_`, la tabla y la
// ficha de cada PR en .docs/hoja-de-ruta-implementacion.md (entre
// <!-- pr:inicio --> y <!-- pr:fin -->). Capas, niveles y etiquetas salen de
// las casillas; lo demás, de scripts/capas-pr.data.mjs.
//
//   node scripts/capas-pr.mjs           imprime la sección
//   node scripts/capas-pr.mjs --write   la escribe en el documento
//   node scripts/capas-pr.mjs --labels  imprime las etiquetas de cada PR

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HITOS, PRS } from "./capas-pr.data.mjs";

const root = resolve(fileURLToPath(import.meta.url), "../..");
const capasDir = join(root, ".docs/capas");
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

/** pr → [{ sub, nivel, texto, hecho }] */
function casillas() {
  const byPr = new Map();
  for (const capa of readdirSync(capasDir, { withFileTypes: true })) {
    if (!capa.isDirectory()) continue;
    for (const sub of readdirSync(join(capasDir, capa.name), { withFileTypes: true })) {
      const file = join(capasDir, capa.name, sub.name, "README.md");
      if (!sub.isDirectory() || !existsSync(file)) continue;
      const text = readFileSync(file, "utf8");
      const id = text.match(/^id: (.+)$/m)?.[1]?.trim();
      let level = null;
      let section = null;
      for (const line of text.split("\n")) {
        const lv = line.match(/^## (N\d)/);
        if (lv) level = lv[1];
        if (line.startsWith("#### ")) section = line.slice(5).trim();
        const box = line.match(/^- \[( |x)\] (.*)$/);
        if (!box || section !== "Funcionalidad" || !level) continue;
        const prs = [...line.matchAll(/_\(PR-(\d+)\)_/g)].map((m) => Number(m[1]));
        const texto = box[2].replace(/\s*_\(PR-\d+\)_/g, "").replace(/\s*—\s*_hecho:.*$/, "").replace(/\s*_\(objetivo.*$/, "").trim();
        for (const n of prs) {
          if (!byPr.has(n)) byPr.set(n, []);
          byPr.get(n).push({ sub: id, nivel: level, texto, hecho: box[1] === "x", dir: `${capa.name}/${sub.name}` });
        }
      }
    }
  }
  return byPr;
}

const capaOf = (sub) => sub.split(".")[0];
const uniq = (a) => [...new Set(a)];

function derive(pr, list) {
  const capas = uniq(list.map((c) => capaOf(c.sub))).sort((a, b) => ROMAN.indexOf(a) - ROMAN.indexOf(b));
  const niveles = uniq(list.map((c) => c.nivel)).sort();
  const labels = [...capas.map((c) => `capa-${c}`), ...niveles, ...pr.tipo, HITOS[pr.hito].label];
  const done = list.filter((c) => c.hecho).length;
  return { capas, niveles, labels, done, total: list.length };
}

function render() {
  const by = casillas();
  const rows = [];
  const cards = [];
  for (const pr of PRS) {
    const list = by.get(pr.n) ?? [];
    const d = derive(pr, list);
    const num = String(pr.n).padStart(2, "0");
    const estado = pr.pr ? `[abierto](${pr.pr})` : d.total && d.done === d.total ? "hecho" : "pendiente";
    rows.push(
      `| **${num}** | ${HITOS[pr.hito].nombre} | ${pr.titulo} | ${d.capas.join(", ") || "—"} | ${d.niveles.join(", ") || "—"} | ${d.total ? `${d.done}/${d.total}` : "base técnica"} | ${pr.sql ? `\`${pr.sql.replace(".sql", "")}\`` : "—"} | ${estado} |`,
    );
    const groups = new Map();
    for (const c of list) {
      const key = `${c.sub} · ${c.nivel}`;
      if (!groups.has(key)) groups.set(key, { dir: c.dir, items: [] });
      groups.get(key).items.push(c);
    }
    cards.push(
      [
        `### PR-${num} · ${pr.titulo}`,
        "",
        `- **Rama:** \`${pr.rama}\` · **Hito:** ${pr.hito} · ${HITOS[pr.hito].nombre}`,
        `- **Etiquetas:** ${d.labels.map((l) => `\`${l}\``).join(" ")}`,
        `- **Depende de:** ${pr.deps.length ? pr.deps.map((x) => `PR-${String(x).padStart(2, "0")}`).join(", ") : "—"}`,
        `- **Esquema:** ${pr.sql ? `[\`sql/${pr.sql}\`](sql/${pr.sql})` : "sin tablas nuevas"}`,
        ...(pr.base ? [`- **Nota:** ${pr.base}`] : []),
        `- **Hecho cuando:** ${pr.hecho}`,
        ...(pr.pr ? [`- **PR:** ${pr.pr}`] : []),
        ...(groups.size
          ? [
              "- **Casillas que marca:**",
              ...[...groups].flatMap(([key, g]) => [
                `  - [\`${key}\`](capas/${g.dir}/README.md)`,
                ...g.items.map((c) => `    - [${c.hecho ? "x" : " "}] ${c.texto}`),
              ]),
            ]
          : []),
        "",
      ].join("\n"),
    );
  }
  return [
    "| PR | Hito | Qué | Capas | Niveles | Casillas | Esquema | Estado |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    ...cards,
  ].join("\n");
}

const START = "<!-- pr:inicio -->";
const END = "<!-- pr:fin -->";
if (process.argv.includes("--labels")) {
  const by = casillas();
  for (const pr of PRS) console.log(`PR-${String(pr.n).padStart(2, "0")}: ${derive(pr, by.get(pr.n) ?? []).labels.join(",")}`);
} else if (process.argv.includes("--write")) {
  const file = join(root, ".docs/hoja-de-ruta-implementacion.md");
  const text = readFileSync(file, "utf8");
  const i = text.indexOf(START);
  const j = text.indexOf(END);
  if (i < 0 || j < 0) throw new Error(`faltan los marcadores ${START} … ${END}`);
  writeFileSync(file, `${text.slice(0, i + START.length)}\n${render()}\n${text.slice(j)}`);
  console.log(`Actualizado ${file}`);
} else {
  console.log(render());
}
