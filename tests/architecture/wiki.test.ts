/**
 * La wiki (docs/wiki) es la fuente única de la documentación vigente. Esta prueba evita que se pudra:
 * las páginas generadas del código no se desfasan, los enlaces resuelven, cada sección tiene índice completo y
 * nada marcado como histórico o pendiente de validación se cuela entre las páginas vigentes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { describe, expect, test } from "vitest";

import { BUSINESS_PERMISSIONS } from "@/lib/core/auth/permissions";

const ROOT = join(import.meta.dirname, "..", "..");
const WIKI = "docs/wiki";
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const paginas = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((n) => {
    const ruta = `${dir}/${n}`;
    return statSync(join(ROOT, ruta)).isDirectory() ? paginas(ruta) : n.endsWith(".md") ? [ruta] : [];
  });

const todas = paginas(WIKI);
const SECCIONES = readdirSync(join(ROOT, WIKI)).filter((n) => /^\d\d-/.test(n)).sort();

describe("estructura de la wiki", () => {
  test("hay Home, barra lateral y las once secciones numeradas", () => {
    expect(existsSync(join(ROOT, WIKI, "Home.md"))).toBe(true);
    expect(existsSync(join(ROOT, WIKI, "_Sidebar.md"))).toBe(true);
    expect(SECCIONES).toHaveLength(11);
    expect(SECCIONES.map((s) => s.slice(0, 2))).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"]);
  });

  test("cada sección tiene índice y todas sus páginas figuran en él", () => {
    for (const s of SECCIONES) {
      const indice = read(`${WIKI}/${s}/README.md`);
      const propias = readdirSync(join(ROOT, WIKI, s)).filter((n) => n.endsWith(".md") && n !== "README.md");
      expect(propias.length, `${s} sin páginas`).toBeGreaterThan(0);
      for (const p of propias) expect(indice, `${s}/${p} falta en el índice`).toContain(`(${p})`);
    }
  });

  test("Home y la barra lateral enlazan a las once secciones", () => {
    for (const s of SECCIONES) {
      expect(read(`${WIKI}/Home.md`), s).toContain(`(${s}/README.md)`);
      expect(read(`${WIKI}/_Sidebar.md`), s).toContain(`(${s}/README.md)`);
    }
  });
});

describe("enlaces", () => {
  test("todo enlace relativo de la wiki resuelve a un archivo existente", () => {
    const rotos: string[] = [];
    for (const f of todas) {
      const texto = read(f).replace(/```[\s\S]*?```/g, "");
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

describe("contenido vigente", () => {
  test("ninguna página vigente lleva el aviso de histórica o pendiente de validación", () => {
    const marcadas = todas.filter((f) => /^> \*\*(Pendiente de validación|NO VÁLIDA|Estado: anterior a V10)/m.test(read(f)));
    expect(marcadas).toEqual([]);
  });
});

describe("páginas generadas del código", () => {
  const matriz = read(`${WIKI}/06-seguridad-y-permisos/matriz-de-permisos.md`);
  test("la matriz de permisos documentada coincide con BUSINESS_PERMISSIONS", () => {
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

  test("el mapa de áreas y módulos lista cada módulo de lib/", () => {
    const mapa = read(`${WIKI}/04-modulos/mapa-de-areas-y-modulos.md`);
    for (const area of readdirSync(join(ROOT, "lib")).filter((n) => statSync(join(ROOT, "lib", n)).isDirectory())) {
      expect(mapa, area).toContain(`### \`lib/${area}\``);
      for (const mod of readdirSync(join(ROOT, "lib", area)).filter((n) => statSync(join(ROOT, "lib", area, n)).isDirectory())) {
        expect(mapa, `lib/${area}/${mod}`).toContain(`\`${mod}/\``);
      }
    }
  });

  test("la lista de pruebas de arquitectura incluye cada archivo", () => {
    const lista = read(`${WIKI}/10-pruebas-y-calidad/pruebas-de-arquitectura.md`);
    for (const f of readdirSync(join(ROOT, "tests/architecture")).filter((n) => n.endsWith(".test.ts"))) {
      expect(lista, f).toContain(`\`${f}\``);
    }
  });
});
