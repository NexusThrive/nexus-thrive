/**
 * Todo el diseño operativo vive en `packages/brand/`. Esta prueba evita que los documentos de diseño vuelvan a repartirse por el
 * repositorio y comprueba que el índice del paquete y los enlaces de su documentación siguen al día.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const DOCS = "packages/brand/docs";
const SECCIONES = ["01-marca", "02-producto", "03-sistema", "04-patrones", "05-calidad", "06-auditorias", "07-marketing", "08-blueprint-ux", "storybook"];

const archivos = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((n) => {
    const ruta = `${dir}/${n}`;
    return statSync(join(ROOT, ruta)).isDirectory() ? archivos(ruta) : [ruta];
  });

describe("diseño operativo en packages/brand", () => {
  test("existen las secciones de documentación y cada una tiene contenido", () => {
    for (const s of SECCIONES) expect(archivos(`${DOCS}/${s}`).length, s).toBeGreaterThan(0);
  });

  test("no hay documentos de diseño sueltos fuera del paquete", () => {
    for (const f of ["DESIGN.md", "PRODUCT.md", "REDISENO-NEXUS.md", "SYSTEM-DESIGN.md"]) expect(existsSync(join(ROOT, f)), f).toBe(false);
    for (const d of ["docs/design", "docs/brand", "docs/marketing", "components/docs"]) expect(existsSync(join(ROOT, d)), d).toBe(false);
  });

  test("el índice del paquete enlaza a cada sección", () => {
    const indice = readFileSync(join(ROOT, "packages/brand/README.md"), "utf8");
    for (const s of SECCIONES) expect(indice, s).toContain(`docs/${s}/`);
  });

  test("Storybook lee su documentación desde el paquete", () => {
    expect(readFileSync(join(ROOT, ".storybook/main.ts"), "utf8")).toContain("../packages/brand/docs/storybook/**/*.mdx");
  });

  test("los enlaces relativos de la documentación de diseño resuelven", () => {
    const rotos: string[] = [];
    for (const f of archivos(DOCS).filter((x) => /\.mdx?$/.test(x)).concat("packages/brand/README.md")) {
      const texto = readFileSync(join(ROOT, f), "utf8").replace(/```[\s\S]*?```/g, "");
      for (const m of texto.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
        const l = m[1];
        if (/^(https?:|mailto:|#|data:)/.test(l)) continue;
        const destino = decodeURI(l.split("#")[0]);
        if (destino && !existsSync(join(ROOT, posix.join(dirname(f), destino)))) rotos.push(`${f} -> ${l}`);
      }
    }
    expect(rotos).toEqual([]);
  });
});
