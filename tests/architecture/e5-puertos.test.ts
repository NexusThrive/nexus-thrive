/**
 * E5 · Los puertos entre dominios están todos conectados, y se conectan al arrancar.
 *
 * Un puerto sin implementación hace fallar la operación (PortNotProvidedError). Estas pruebas evitan que alguien
 * declare un puerto y olvide conectarlo, o que el arranque del servidor deje de conectarlos.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { providedPorts } from "@/lib/foundation/ports";
import { composePorts } from "@/lib/runtime/ports";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) return sources(rel);
    return /\.(ts|tsx)$/.test(name) && !/\.(test|stories)\./.test(name) ? [rel] : [];
  });
}

/** Nombres de los puertos declarados en el código: `definePort<…>("nombre")`. */
const declarados = sources("lib").flatMap((file) => [...read(file).matchAll(/definePort<[\s\S]*?>\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]).map((name) => ({ name, file })))
  .filter((p) => p.file !== "lib/foundation/ports.ts");

describe("puertos entre dominios", () => {
  test("hay puertos declarados y cada uno tiene un nombre único", () => {
    expect(declarados.length).toBeGreaterThanOrEqual(7);
    const nombres = declarados.map((p) => p.name);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  test("composePorts conecta todos los puertos declarados en el código", () => {
    const conectados = composePorts();
    expect(conectados).toEqual(declarados.map((p) => p.name).sort());
  });

  test("composePorts es idempotente: llamarla otra vez deja los mismos puertos", () => {
    expect(composePorts()).toEqual(composePorts());
    expect(providedPorts()).toEqual(expect.arrayContaining(declarados.map((p) => p.name)));
  });

  test.each(["accounting", "numbering", "payment-gateway", "tenant-provisioning", "fiscal-queue", "payment-checkout", "google-listing"])("el puerto «%s» está declarado", (name) => {
    expect(declarados.map((p) => p.name)).toContain(name);
  });
});

describe("el arranque conecta los puertos", () => {
  test("instrumentation.ts los conecta en el runtime de Node, tras el polyfill de Temporal", () => {
    const source = read("instrumentation.ts");
    expect(source).toMatch(/process\.env\.NEXT_RUNTIME === "nodejs"/);
    expect(source).toContain('import("@/lib/runtime/ports")');
    expect(source.indexOf("temporal-polyfill")).toBeLessThan(source.indexOf("composePorts"));
  });

  test("vitest.setup.ts los conecta cuando hay base de datos de pruebas, dentro de un beforeAll con importación dinámica", () => {
    const source = read("vitest.setup.ts");
    expect(source).toContain("TEST_DATABASE_URL");
    expect(source).toContain("composePorts()");
    // En un beforeAll: los dominios se cargan después de los vi.mock de cada archivo (si no, quedan en caché con el módulo real).
    expect(source).toMatch(/beforeAll\(async \(\) => \{[\s\S]*await import\("@\/lib\/runtime\/ports"\)/);
  });
});
