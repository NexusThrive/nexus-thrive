/** Canonical documentation must remain navigable and match its source contracts. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { BUSINESS_PERMISSIONS } from "@/lib/core/auth/permissions";
import { checkDocumentation, headingAnchors, markdownLinks, SECTIONS } from "../../scripts/docs-check.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const evidence = "docs/09-historico/consolidacion-documental-2026-11-16";
const sha = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
const normalizeADR = (text: string) => text.replace(/\]\([^)]*\)/g, "](REFERENCE)").replace(/docs\/[^\s`<>\)\]]+/g, "DOCUMENT_PATH");

describe("canonical documentation", () => {
  test("all ten sections have a responsible entry point", () => {
    expect(readdirSync(join(ROOT, "docs")).filter((name) => /^\d\d-/.test(name)).sort()).toEqual(SECTIONS);
    for (const section of SECTIONS) {
      expect(read("docs/README.md")).toContain(`](${section}/README.md)`);
      expect(read(`docs/${section}/README.md`).length).toBeGreaterThan(100);
    }
  });

  test("all internal links resolve and every canonical page is reachable", () => {
    const result = checkDocumentation();
    expect(result.errors).toEqual([]);
    expect(result.orphans).toEqual([]);
    // Failures in third-party skills are disclosed rather than hidden as success.
    expect(result.preExisting).toHaveLength(10);
  });

  test("all 22 ADRs stay indexed and accepted decisions retain their wording", () => {
    const records = JSON.parse(read(`${evidence}/adr-integrity.json`)) as { path: string; hash: string; id: string; immutableDecision: boolean; decisionHash: string }[];
    expect(records).toHaveLength(22);
    const index = read("docs/05-decisiones/README.md");
    for (const record of records) {
      const body = read(record.path);
      if (record.immutableDecision) {
        const decision = body.match(/^## Decisión\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1] ?? "";
        expect(sha(normalizeADR(decision)), record.path).toBe(record.decisionHash);
      }
      expect(index).toContain(record.id);
    }
  });

  test("historical SQL remains unchanged while mutable catalogs may evolve", () => {
    const records = JSON.parse(read(`${evidence}/operational-integrity.json`)) as { path: string; hash: string }[];
    // Full migration-time hashes remain evidence, not a permanent freeze on
    // mutable architecture controls, source catalogs or the data manifest.
    for (const record of records.filter((record) => record.path.endsWith(".sql"))) expect(sha(readFileSync(join(ROOT, record.path))), record.path).toBe(record.hash);
    expect(records.filter((record) => record.path.startsWith("docs/08-operaciones/sql-produccion/")).length).toBeGreaterThan(60);
    for (const name of read("scripts/prod-data.txt").split("\n").filter((line) => line.trim() && !line.startsWith("#"))) {
      expect(existsSync(join(ROOT, "docs/08-operaciones/sql-produccion", name))).toBe(true);
    }
  });

  test("REVIEW sources remain present with explicit uncertainty", () => {
    const records = JSON.parse(read(`${evidence}/review-records.json`)) as string[];
    expect(records).toHaveLength(12);
    for (const path of records) expect(read(path)).toContain("REVIEW — pendiente de validación");
  });
});

describe("Markdown navigation parsing", () => {
  test("fences, inline code, reference links and HTML IDs are handled", () => {
    const text = '# Heading\n<a id="fixed"></a>\n[page][ref]\n[ref]: page.md#fixed\n`[example](missing.md)`\n~~~md\n[example](missing.md)\n~~~\n';
    expect(markdownLinks(text).map((link: { url: string }) => link.url)).toEqual(["page.md#fixed"]);
    expect([...headingAnchors(text)]).toEqual(expect.arrayContaining(["heading", "fixed"]));
  });

  test("repeated headings and inline formatting use distinct anchors", () => {
    expect([...headingAnchors('# Same\n# Same\n## `Typed` **heading**\n')]).toEqual(["same", "same-1", "typed-heading"]);
  });

  test("shortcut references and balanced parentheses retain complete targets", () => {
    expect(markdownLinks("[page]\n[page]: section.md\n[path](app/(group)/file.md#title)").map((link: { url: string }) => link.url)).toEqual(["section.md", "app/(group)/file.md#title"]);
  });
});

describe("documents tied to source code", () => {
  const matriz = read(`docs/06-reglas/matriz-de-permisos.md`);
  test("the documented permission matrix matches BUSINESS_PERMISSIONS", () => {
    const roles = ["SUPERADMIN", "OWNER", "ADMIN", "STAFF", "RECEPTION", "ADVISOR"];
    for (const [permiso, permitidos] of Object.entries(BUSINESS_PERMISSIONS)) {
      const fila = matriz.split("\n").find((l) => l.startsWith(`| \`${permiso}\` |`));
      expect(fila, `falta ${permiso}`).toBeDefined();
      const celdas = fila!.split("|").slice(-(roles.length + 1), -1).map((c) => c.trim());
      expect(celdas, permiso).toEqual(roles.map((r) => ((permitidos as readonly string[]).includes(r) ? "✓" : "")));
    }
    const filas = matriz.split("\n").filter((l) => /^\| `[\w.]+` \|/.test(l));
    expect(filas).toHaveLength(Object.keys(BUSINESS_PERMISSIONS).length);
  });

  test("the area map lists every lib module", () => {
    const mapa = read(`docs/02-arquitectura/dominios/mapa-de-areas-y-modulos.md`);
    for (const area of readdirSync(join(ROOT, "lib")).filter((n) => statSync(join(ROOT, "lib", n)).isDirectory())) {
      expect(mapa, area).toContain(`### \`lib/${area}\``);
      for (const mod of readdirSync(join(ROOT, "lib", area)).filter((n) => statSync(join(ROOT, "lib", area, n)).isDirectory())) {
        expect(mapa, `lib/${area}/${mod}`).toContain(`\`${mod}/\``);
      }
    }
  });

  test("the architecture test catalog includes every test file", () => {
    const lista = read(`docs/07-ingenieria/calidad/pruebas-de-arquitectura.md`);
    for (const f of readdirSync(join(ROOT, "tests/architecture")).filter((n) => n.endsWith(".test.ts"))) {
      expect(lista, f).toContain(`\`${f}\``);
    }
  });
});
