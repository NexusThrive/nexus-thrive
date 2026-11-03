/**
 * Congela la deuda de la escala tipográfica (DR-02, T4): ningún archivo puede tener MÁS usos de `text-[Npx]` que su línea base,
 * y un archivo nuevo no puede traerlos (usa `text-2xs`, `text-xs`, `text-ui`, `text-sm`, `text-base`…). La deuda solo baja:
 * al migrar un archivo se actualiza la línea base con `node scripts/type-scale-baseline.mjs`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const BASE: Record<string, number> = JSON.parse(readFileSync(join(import.meta.dirname, "type-scale-baseline.json"), "utf8"));

const archivos = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((n) => {
    const ruta = `${dir}/${n}`;
    if (n === "node_modules" || n.startsWith(".")) return [];
    return statSync(join(ROOT, ruta)).isDirectory() ? archivos(ruta) : [ruta];
  });

const cuenta = (f: string) => (readFileSync(join(ROOT, f), "utf8").match(/text-\[\d+(\.\d+)?px\]/g) ?? []).length;

describe("escala tipográfica: la deuda no crece", () => {
  const actuales = Object.fromEntries(
    [...archivos("app"), ...archivos("components")]
      .filter((f) => /\.tsx$/.test(f) && !/\.stories\.tsx$/.test(f))
      .map((f) => [f, cuenta(f)] as const)
      .filter(([, n]) => n > 0),
  );

  test("ningún archivo supera su línea base ni trae usos nuevos", () => {
    const excesos = Object.entries(actuales)
      .filter(([f, n]) => n > (BASE[f] ?? 0))
      .map(([f, n]) => `${f}: ${n} (base ${BASE[f] ?? 0})`);
    expect(excesos, "usa text-2xs / text-xs / text-ui / text-sm / text-base en lugar de text-[Npx]").toEqual([]);
  });
});
