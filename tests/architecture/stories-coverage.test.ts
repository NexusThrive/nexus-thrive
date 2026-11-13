/**
 * Storybook es la fuente de verdad de la librería (DESIGN.md §3): un componente nuevo de `components/` nace con su historia
 * —variantes y estados— y el código cumple ese contrato, no al revés. La deuda heredada vive en `stories-baseline.json` y solo
 * baja: al escribir la historia de un componente de la lista, se regenera con `node scripts/stories-baseline.mjs`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { uncoveredComponents } from "../../scripts/stories-baseline.mjs";

const BASE: string[] = JSON.parse(readFileSync(join(import.meta.dirname, "stories-baseline.json"), "utf8"));

describe("Storybook como fuente de verdad", () => {
  test("ningún componente nuevo llega sin historia", () => {
    const nuevos = uncoveredComponents().filter((f: string) => !BASE.includes(f));
    expect(nuevos, "crea su `.stories.tsx` con variantes y estados antes de usarlo en la app").toEqual([]);
  });
});
