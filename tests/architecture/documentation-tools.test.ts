/** Documentation generators must write only their declared sections and preserve marked work. */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const LAYERS = "docs/01-producto/funcionalidades/capas";
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
const read = (path: string) => readFileSync(path, "utf8");

test("progress and integration generation are idempotent in an isolated copy", () => {
  const root = mkdtempSync(join(tmpdir(), "nexus-doc-generators-"));
  mkdirSync(join(root, "scripts"));
  cpSync(join(ROOT, LAYERS), join(root, LAYERS), { recursive: true });
  for (const file of ["capas-progreso.mjs", "capas-integracion.mjs", "capas-integracion.data.mjs"]) cpSync(join(ROOT, "scripts", file), join(root, "scripts", file));
  const target = join(root, LAYERS, "README.md");
  const beforeProgress = read(target);
  const run = (file: string) => execFileSync(process.execPath, [join(root, "scripts", file), "--write"], { cwd: root, stdio: "pipe" });
  const outsideProgress = (text: string) => text.replace(/<!-- progreso:inicio -->[\s\S]*?<!-- progreso:fin -->/, "PROGRESS");

  run("capas-progreso.mjs");
  const generated = read(target);
  expect(outsideProgress(generated)).toBe(outsideProgress(beforeProgress));
  run("capas-progreso.mjs");
  expect(read(target)).toBe(generated);

  const pages = walk(join(root, LAYERS)).filter((path) => path.endsWith(".md"));
  const sample = pages.find((path) => read(path).includes("<!-- api-lectura -->"))!;
  // A marked checkbox must survive regeneration, not merely an unmodified fixture.
  writeFileSync(sample, read(sample).replace(/- \[ \] ([^\n]+<!-- api-lectura -->)/, "- [x] $1"));
  const before = new Map(pages.map((path) => [path, read(path)]));
  const outsideIntegration = (text: string) => text.replace(/<!-- integracion:inicio -->[\s\S]*?<!-- integracion:fin -->\n?/, "INTEGRATION\n");
  run("capas-integracion.mjs");
  expect(read(sample)).toMatch(/- \[x\] [^\n]+<!-- api-lectura -->/);
  for (const page of pages) expect(outsideIntegration(read(page)), page).toBe(outsideIntegration(before.get(page)!));
  const after = new Map(pages.map((path) => [path, read(path)]));
  run("capas-integracion.mjs");
  for (const page of pages) expect(read(page), page).toBe(after.get(page));
});
