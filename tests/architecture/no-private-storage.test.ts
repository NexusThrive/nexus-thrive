import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Los datos de un negocio no se guardan en el navegador (pwa.md). La caché de secciones vive solo en memoria
 * (`lib/experience/hooks/section-cache.ts`): sin `localStorage`, `sessionStorage` ni IndexedDB. Tampoco se usa IndexedDB en la interfaz.
 * (Las preferencias de interfaz que ya usan `localStorage` —tema, columnas, menú— no son datos de negocio y no entran aquí.)
 */

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(stories|test)\./.test(name)) out.push(full);
  }
  return out;
}

describe("almacenamiento del navegador", () => {
  it("la caché de secciones no usa storage", () => {
    for (const file of ["lib/experience/hooks/section-cache.ts", "lib/experience/hooks/use-section-snapshot.ts"]) {
      // Se ignoran los comentarios: la regla es sobre el código.
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(code, file).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    }
  });

  it("IndexedDB no se usa en componentes ni páginas", () => {
    const found = [...files("components"), ...files("app")].filter((f) => /indexedDB/.test(readFileSync(f, "utf8")));
    expect(found).toEqual([]);
  });
});
