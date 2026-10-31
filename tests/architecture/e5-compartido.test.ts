/**
 * E5 · Lo que Business y Core comparten con Finance sin escribir en Finance.
 *
 * Cuatro módulos de Finance son puros (sin imports de Nexus, sin acceso a datos): el vocabulario de
 * medios y estados de pago, el cálculo de series del tablero, la antigüedad de cartera y el análisis
 * de montos en pesos. Viven en `lib/foundation/kernel/` (V10 · M5.1) y estas pruebas impiden que
 * dejen de ser puros en silencio.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore el verificador es un .mjs sin tipos
import { classify, loadJson } from "../../scripts/check-layers.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const layers = loadJson("docs/architecture/layers.json");

const PUROS = [
  "lib/foundation/kernel/payment-vocabulary.ts",
  "lib/foundation/kernel/finance-series.ts",
  "lib/foundation/kernel/aging.ts",
  "lib/foundation/kernel/cop-amount.ts",
];

describe("módulos puros de Finance compartidos", () => {
  test.each(PUROS)("%s está en Foundation", (file) => {
    expect(classify(file, layers)?.layer).toBe("foundation");
  });

  test.each(PUROS)("%s no importa nada de Nexus ni de la base de datos ni del sistema de archivos", (file) => {
    const imports = [...read(file).matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)].map((m) => m[1]);
    expect(imports, file).toEqual([]);
    expect(read(file)).not.toMatch(/\bprocess\.env\b|\bfetch\(|\bnode:/);
  });

  test("la carpeta kernel contiene exactamente los módulos puros esperados", () => {
    const dir = join(ROOT, "lib/foundation/kernel");
    const produccion = readdirSync(dir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts")).map((n) => `lib/foundation/kernel/${n}`);
    expect(produccion.sort()).toEqual([...PUROS].sort());
  });

  test("el resto de Finance sigue en la capa domains: solo lo puro salió", () => {
    for (const file of ["lib/domains/finance/accounting/ledger-db.ts", "lib/domains/finance/tax/tax-db.ts", "lib/domains/finance/receivables/receivables-db.ts"]) {
      expect(classify(file, layers)?.layer, file).toBe("domains");
    }
  });
});
