#!/usr/bin/env node
// Validate local Markdown navigation without publishing or generating a wiki.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
export const SECTIONS = ["00-identidad", "01-producto", "02-arquitectura", "03-experiencia", "04-integraciones", "05-decisiones", "06-reglas", "07-ingenieria", "08-operaciones", "09-historico"];

export function stripFences(text) {
  let fence = null;
  return text.split("\n").map((line) => {
    const match = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (match) {
      if (!fence) fence = match[1];
      else if (match[1][0] === fence[0] && match[1].length >= fence.length) fence = null;
      return "";
    }
    return fence ? "" : line;
  }).join("\n");
}

export function headingAnchors(text) {
  const anchors = new Set();
  const seen = new Map();
  const lines = stripFences(text).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    const setext = i + 1 < lines.length && /^\s{0,3}(?:={3,}|-{3,})\s*$/.test(lines[i + 1]) && lines[i].trim() && !/^[-|>]/.test(lines[i]);
    if (!match && !setext) continue;
    const heading = (match ? match[1] : lines[i]).replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<[^>]*>/g, "");
    const slug = heading.toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, "").replace(/ /g, "-");
    let id = slug;
    let count = seen.get(slug) ?? 0;
    while (anchors.has(id)) id = `${slug}-${++count}`;
    seen.set(slug, count);
    anchors.add(id);
  }
  for (const match of text.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) anchors.add(match[1]);
  return anchors;
}

export function markdownLinks(text) {
  const body = stripFences(text).replace(/(`+)[^\n]*?\1/g, (part) => " ".repeat(part.length));
  const definitions = new Map([...body.matchAll(/^\s{0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?/gm)].map((match) => [match[1].toLowerCase(), match[2]]));
  const links = [];
  let consumed = -1;
  for (const match of body.matchAll(/!?\[((?:\\.|[^\]\\\n])*)\]/g)) {
    if (match.index < consumed) continue;
    const after = match.index + match[0].length;
    if (body[after] === ":") continue; // A reference definition is not a link.
    if (body[after] === "(") {
      let start = after + 1;
      while (/\s/.test(body[start] ?? "") && start < body.length) start++;
      if (body[start] === "<") {
        const end = body.indexOf(">", start + 1);
        if (end >= 0) { links.push({ url: body.slice(start + 1, end), index: match.index }); consumed = end + 1; }
      } else {
        let end = start;
        let depth = 0;
        for (; end < body.length; end++) {
          const char = body[end];
          if (char === "\\") { end++; continue; }
          if (char === "(") depth++;
          else if (char === ")") { if (!depth) break; depth--; }
          else if (/\s/.test(char) && !depth) break;
        }
        if (end > start) { links.push({ url: body.slice(start, end).replace(/\\([()])/g, "$1"), index: match.index }); consumed = end + 1; }
      }
    } else if (body[after] === "[") {
      const end = body.indexOf("]", after + 1);
      if (end < 0) continue;
      const key = body.slice(after + 1, end) || match[1];
      const url = definitions.get(key.toLowerCase());
      if (url) links.push({ url, index: match.index });
      consumed = end + 1;
    } else {
      const url = definitions.get(match[1].toLowerCase());
      if (url) links.push({ url, index: match.index });
    }
  }
  for (const match of body.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) links.push({ url: match[1], index: match.index });
  return links.map((link) => ({ ...link, line: body.slice(0, link.index).split("\n").length }));
}

export function checkDocumentation({ root = ROOT } = {}) {
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const files = [...new Set(listed)].filter((file) => /\.mdx?$/.test(file) && existsSync(join(root, file)));
  const documents = new Map(files.map((file) => [file, readFileSync(join(root, file), "utf8")]));
  const anchors = new Map([...documents].map(([file, text]) => [file, headingAnchors(text)]));
  const baseline = JSON.parse(readFileSync(join(root, "scripts/docs-link-baseline.json"), "utf8"));
  const allowed = new Set(baseline.map(({ source, url }) => `${source}\0${url}`));
  const errors = [];
  const preExisting = [];
  const edges = new Map();
  let linkCount = 0;
  for (const [source, text] of documents) {
    const to = new Set();
    for (const { url, line } of markdownLinks(text)) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) continue;
      linkCount++;
      let pathPart, anchor;
      try {
        const hash = url.indexOf("#");
        anchor = hash >= 0 ? decodeURIComponent(url.slice(hash + 1)) : "";
        pathPart = decodeURIComponent((hash >= 0 ? url.slice(0, hash) : url).split("?")[0]);
      } catch {
        errors.push(`${source}:${line}: malformed URL ${url}`);
        continue;
      }
      const target = pathPart ? posix.normalize(pathPart.startsWith("/") ? pathPart.slice(1) : posix.join(posix.dirname(source), pathPart)) : source;
      const abs = join(root, target);
      const indexedDirectory = existsSync(abs) && statSync(abs).isDirectory() && documents.has(`${target}/README.md`);
      const effectiveTarget = indexedDirectory ? `${target}/README.md` : target;
      let error;
      if (!existsSync(abs)) error = `${source}:${line}: missing path ${url}`;
      else if (anchor && anchors.has(effectiveTarget) && !anchors.get(effectiveTarget).has(anchor)) error = `${source}:${line}: missing anchor ${url}`;
      else if (indexedDirectory) to.add(effectiveTarget);
      else if (documents.has(target)) to.add(target);
      if (error) {
        if (allowed.has(`${source}\0${url}`)) preExisting.push(error);
        else errors.push(error);
      }
    }
    edges.set(source, to);
  }
  for (const section of SECTIONS) {
    if (!documents.has(`docs/${section}/README.md`)) errors.push(`Missing section index: ${section}`);
  }
  const reachable = new Set(["docs/README.md"]);
  for (const stack = ["docs/README.md"]; stack.length;) {
    for (const next of edges.get(stack.pop()) ?? []) if (!reachable.has(next)) { reachable.add(next); stack.push(next); }
  }
  const canonical = files.filter((file) => SECTIONS.some((section) => file.startsWith(`docs/${section}/`)));
  const orphans = canonical.filter((file) => !reachable.has(file));
  for (const file of orphans) errors.push(`Not reachable from docs/README.md: ${file}`);
  for (const retired of ["docs/wiki", "docs/decisions", "docs/nexus-architecture", "docs/product", "docs/construction", "docs/superpowers", "docs/n8n", "docs/prod-sql", "docs/architecture", "docs/ingenieria", "docs/internal", "docs/knowledge", "docs/diagrams", "docs/ci", "docs/diagnostico", "docs/excalidraw"]) {
    if (existsSync(join(root, retired))) errors.push(`Retired documentation tree still exists: ${retired}`);
  }
  return { errors, preExisting, orphans, documents: files.length, links: linkCount };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkDocumentation();
  console.log(`Documentation: ${result.documents} files, ${result.links} local links, ${result.errors.length} errors, ${result.preExisting.length} pre-existing third-party failures.`);
  for (const error of result.errors) console.error(error);
  for (const error of result.preExisting) console.log(`BASELINE: ${error}`);
  if (result.errors.length) process.exitCode = 1;
}
