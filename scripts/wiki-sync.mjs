#!/usr/bin/env node
// Wiki de GitHub ← docs/wiki
//
// La fuente de verdad es `docs/wiki/` (se edita, se revisa y se versiona con el código). La Wiki de GitHub es un
// repositorio Git aparte (`<repo>.wiki.git`) y plano, así que este script GENERA una copia lista para publicar:
//
//   node scripts/wiki-sync.mjs build   [--out DIR] [--repo-url URL] [--branch main]
//   node scripts/wiki-sync.mjs check                       genera en un directorio temporal y valida
//   node scripts/wiki-sync.mjs publish --remote RUTA_O_URL [--confirm]
//
// `publish` SIN `--confirm` es una simulación (dry run): clona el remoto, copia la wiki generada y muestra qué
// cambiaría, sin commit ni push. Con `--confirm` además exige NEXUS_WIKI_PUBLISH=yes. No hay publicación automática.
//
// Reglas de la conversión:
//   · Páginas planas: `04-modulos/mapa.md` → `04-modulos-mapa.md`; `NN-sección/README.md` → `NN-sección.md`.
//   · Enlaces entre páginas de la wiki → nombre de página; enlaces a código u otros documentos del repositorio →
//     URL absoluta a GitHub (`blob`/`tree`).
//   · Se quita el front matter YAML y se añade un pie con la ruta de origen (no editar en la Wiki de GitHub).

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const SRC = "docs/wiki";
const DEFAULT_REPO = "https://github.com/NexusThrive/nexus-thrive";

/** Recorre `dir` y devuelve rutas relativas a la raíz del repositorio (con `/`). */
const walk = (dir) =>
  readdirSync(join(ROOT, dir)).flatMap((n) => {
    const ruta = `${dir}/${n}`;
    return statSync(join(ROOT, ruta)).isDirectory() ? walk(ruta) : [ruta];
  });

/** `docs/wiki/04-modulos/x.md` → `04-modulos-x`; README y Home/_Sidebar tienen nombre propio. */
export function pageName(srcPath) {
  const rel = srcPath.slice(SRC.length + 1).replace(/\.md$/, "");
  if (rel === "Home" || rel === "_Sidebar") return rel;
  return rel.replace(/\/README$/, "").split("/").join("-");
}

const stripFrontMatter = (t) => t.replace(/^---\n[\s\S]*?\n---\n+/, "");

/** Convierte un documento: reescribe enlaces y añade pie. Devuelve el texto y los problemas encontrados. */
export function convert(srcPath, text, { pages, repoUrl, branch }) {
  const problems = [];
  const body = stripFrontMatter(text)
    .split(/(```[\s\S]*?```)/g)
    .map((seg, i) =>
      i % 2
        ? seg
        : seg.replace(/(\]\(\s*<?)([^)\s>]+)(>?(?:\s+"[^"]*")?\s*\))/g, (m, a, link, c) => {
            if (/^(https?:|mailto:|#|data:)/.test(link)) return m;
            const [pathPart, ...rest] = link.split(/(?=[#?])/);
            const tail = rest.join("");
            const abs = posix.normalize(posix.join(posix.dirname(srcPath), decodeURI(pathPart))).replace(/\/$/, "");
            const asPage = pages.get(abs) ?? pages.get(`${abs}/README.md`);
            if (asPage) return `${a}${asPage}${tail}${c}`;
            if (abs.startsWith(`${SRC}/assets/`)) return `${a}assets/${abs.slice(SRC.length + 8)}${tail}${c}`;
            if (!existsSync(join(ROOT, abs))) {
              problems.push(`${srcPath}: enlace roto → ${link}`);
              return m;
            }
            const kind = statSync(join(ROOT, abs)).isDirectory() ? "tree" : "blob";
            return `${a}${repoUrl}/${kind}/${branch}/${abs}${tail}${c}`;
          }),
    )
    .join("");
  const pie = srcPath.endsWith("_Sidebar.md")
    ? ""
    : `\n\n---\n<sub>Esta página se genera desde [\`${srcPath}\`](${repoUrl}/blob/${branch}/${srcPath}). **No la edites en la Wiki de GitHub**: abre un cambio en el repositorio.</sub>\n`;
  return { text: body.replace(/\s*$/, "\n") + pie, problems };
}

/** @param {{ out: string, repoUrl?: string, branch?: string }} opts */
export function build({ out, repoUrl = DEFAULT_REPO, branch = "main" }) {
  const sources = walk(SRC);
  const md = sources.filter((f) => f.endsWith(".md"));
  const pages = new Map();
  const names = new Map();
  for (const f of md) {
    const name = pageName(f);
    if (names.has(name)) throw new Error(`Nombre de página repetido «${name}»: ${names.get(name)} y ${f}`);
    names.set(name, f);
    pages.set(f, name);
  }
  mkdirSync(out, { recursive: true });
  const problems = [];
  for (const f of md) {
    const { text, problems: p } = convert(f, readFileSync(join(ROOT, f), "utf8"), { pages, repoUrl, branch });
    problems.push(...p);
    writeFileSync(join(out, `${pages.get(f)}.md`), text);
  }
  for (const f of sources.filter((x) => !x.endsWith(".md"))) {
    const dest = join(out, f.startsWith(`${SRC}/assets/`) ? `assets/${f.slice(SRC.length + 8)}` : f.slice(SRC.length + 1));
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(ROOT, f), dest);
  }
  writeFileSync(
    join(out, "_Footer.md"),
    `Documentación generada desde [\`${SRC}\`](${repoUrl}/tree/${branch}/${SRC}). Para cambiar algo, edita el repositorio.\n`,
  );
  return { pages: [...names.keys()], problems };
}

/** Comprueba la salida: sin enlaces rotos, sin `.md` en enlaces internos, páginas alcanzables desde Home. */
export function validate(out, { pages, problems }) {
  const errors = [...problems];
  const have = new Set(readdirSync(out).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)));
  const edges = new Map();
  for (const name of pages) {
    const t = readFileSync(join(out, `${name}.md`), "utf8").replace(/```[\s\S]*?```/g, "");
    const to = new Set();
    for (const m of t.matchAll(/\]\(\s*<?([^)\s>]+)/g)) {
      const l = m[1];
      if (/^(https?:|mailto:|#|data:)/.test(l)) continue;
      const target = decodeURI(l.split("#")[0]);
      if (!target) continue;
      if (target.endsWith(".md")) errors.push(`${name}: enlace interno con .md → ${l}`);
      else if (target.startsWith("assets/")) { if (!existsSync(join(out, target))) errors.push(`${name}: imagen inexistente → ${l}`); }
      else if (!have.has(target)) errors.push(`${name}: página inexistente → ${l}`);
      else to.add(target);
    }
    edges.set(name, to);
  }
  const seen = new Set(["Home"]);
  for (const stack = ["Home"]; stack.length; ) for (const n of edges.get(stack.pop()) ?? []) if (!seen.has(n)) { seen.add(n); stack.push(n); }
  const orphans = pages.filter((n) => !seen.has(n) && n !== "_Sidebar");
  return { errors, orphans };
}

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function publish({ remote, out, confirm }) {
  const work = mkdtempSync(join(tmpdir(), "wiki-publish-"));
  const sha = run("git", ["rev-parse", "--short", "HEAD"], ROOT);
  const dirty = run("git", ["status", "--porcelain", "--", SRC], ROOT);
  run("git", ["clone", "--quiet", remote, work], ROOT);
  for (const n of readdirSync(work)) if (n !== ".git") rmSync(join(work, n), { recursive: true, force: true });
  cpSync(out, work, { recursive: true });
  run("git", ["add", "-A"], work);
  const changes = run("git", ["status", "--short"], work);
  console.log(changes ? `Cambios respecto a la wiki publicada:\n${changes.split("\n").slice(0, 40).join("\n")}${changes.split("\n").length > 40 ? "\n…" : ""}` : "La wiki publicada ya está al día.");
  if (!confirm) { console.log(`\nSIMULACIÓN (dry run): no se hizo commit ni push. Para publicar: --confirm con NEXUS_WIKI_PUBLISH=yes.`); return; }
  if (process.env.NEXUS_WIKI_PUBLISH !== "yes") throw new Error("Publicar exige NEXUS_WIKI_PUBLISH=yes en el entorno.");
  if (dirty) throw new Error(`docs/wiki tiene cambios sin confirmar; confírmalos antes de publicar:\n${dirty}`);
  if (!changes) return;
  run("git", ["commit", "-q", "-m", `docs(wiki): sincroniza desde ${sha}`], work);
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], work);
  run("git", ["push", "origin", `HEAD:${branch}`], work);
  console.log(`Publicado en ${remote} (${branch}) desde ${sha}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd = "check", ...argv] = process.argv.slice(2);
  const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
  const repoUrl = opt("--repo-url", DEFAULT_REPO);
  const branch = opt("--branch", "main");
  const out = resolve(opt("--out", mkdtempSync(join(tmpdir(), "wiki-build-"))));
  if (!["build", "check", "publish"].includes(cmd)) { console.error("Uso: wiki-sync.mjs build|check|publish"); process.exit(2); }
  if (cmd === "build" && existsSync(out) && readdirSync(out).length) rmSync(out, { recursive: true, force: true });
  const result = build({ out, repoUrl, branch });
  const { errors, orphans } = validate(out, result);
  console.log(`Wiki generada en ${relative(process.cwd(), out) || out}: ${result.pages.length} páginas, ${errors.length} errores, ${orphans.length} páginas no alcanzables desde Home.`);
  for (const e of errors.slice(0, 30)) console.log(`  ✗ ${e}`);
  for (const o of orphans.slice(0, 30)) console.log(`  ⚠ no alcanzable: ${o}`);
  if (errors.length) process.exit(1);
  if (cmd === "publish") {
    const remote = opt("--remote");
    if (!remote) { console.error("publish exige --remote RUTA_O_URL"); process.exit(2); }
    try {
      publish({ remote, out, confirm: argv.includes("--confirm") });
    } catch (e) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
  }
}
