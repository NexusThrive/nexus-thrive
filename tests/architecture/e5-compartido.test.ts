/**
 * E5 · Lo que Business y Core comparten con Finance sin escribir en Finance.
 *
 * Tres módulos de Finance son puros (sin imports de Nexus, sin acceso a datos): el vocabulario de
 * medios y estados de pago, el cálculo de series del tablero y la antigüedad de cartera. Son
 * Foundation por esa propiedad, y estas pruebas impiden que dejen de serlo en silencio.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore el verificador es un .mjs sin tipos
import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const layers = loadJson("docs/architecture/layers.json");

const PUROS = ["lib/finance/index.ts", "lib/finance/series.ts", "lib/receivables/aging.ts"];

describe("módulos puros de Finance compartidos", () => {
  test.each(PUROS)("%s está en Foundation", (file) => {
    expect(classify(file, layers)?.layer).toBe("foundation");
  });

  test.each(PUROS)("%s no importa nada de Nexus ni de la base de datos ni del sistema de archivos", (file) => {
    const imports = [...read(file).matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)].map((m) => m[1]);
    expect(imports, file).toEqual([]);
    expect(read(file)).not.toMatch(/\bprocess\.env\b|\bfetch\(|\bnode:/);
  });

  test("el resto de Finance sigue en la capa domains: solo lo puro salió", () => {
    for (const file of ["lib/finance/cop-amount.ts", "lib/accounting/ledger-db.ts", "lib/tax/tax-db.ts", "lib/receivables/receivables-db.ts"]) {
      expect(classify(file, layers)?.layer, file).toBe("domains");
    }
  });
});
