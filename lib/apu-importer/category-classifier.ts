/**
 * Clasificador de categorías de insumos.
 *
 * Orden de decisiones (determinístico):
 * 1. Si el archivo trae una celda de categoría válida → se usa tal cual.
 * 2. Si no, se infiere por palabras clave sobre el nombre. Si se infiere,
 *    la fila queda marcada WARNING "Categoría inferida automáticamente".
 * 3. Fallback → MATERIAL (nunca se descarta información por esto).
 */
import type { ApuItemCategoryValue } from "@/lib/apu-engine";
import { matchesKeyword, normalizeCategoryCell } from "./fuzzy-matcher";

export interface CategoryResult {
  category: ApuItemCategoryValue;
  inferred: boolean;
}

/** Palabras clave por categoría (normalizadas internamente al comparar). */
const CATEGORY_KEYWORDS: Record<
  Exclude<ApuItemCategoryValue, "MATERIAL" | "OTRO" | "SUBCONTRATO">,
  string[]
> = {
  MANO_DE_OBRA: [
    "jornal", "oficial", "ayudante", "cuadrilla", "operario", "maestro",
    "peon", "peón", "mono", "hh ", "horas-hombre", "trabajador", "obrero",
  ],
  EQUIPO: [
    "alquiler", "mezcladora", "andamio", "compactador", "herramienta",
    "grua", "grúa", "planta", "taladro", "vibrador", "concretera",
    "retroexcavadora", "excavadora", "bomba", "molino", "trituradora", "soldadora",
  ],
  TRANSPORTE: [
    "viaje", "flete", "acarreo", "volqueta", "transporte", "m3-km",
    "m3km", "camion", "camión", "carretada", "despacho",
  ],
};

const NEGATIVE_HINTS = ["derecho", "licencia", "impuesto", "seguro"];

/** Inferir categoría a partir del nombre (sin categoría explícita del archivo). */
export function inferCategory(name: string): ApuItemCategoryValue {
  let best: ApuItemCategoryValue = "MATERIAL";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    Exclude<ApuItemCategoryValue, "MATERIAL">,
    string[],
  ][]) {
    let score = 0;
    for (const keyword of keywords) {
      if (matchesKeyword(name, keyword)) {
        score += keyword.length >= 5 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  // Negativos ganan solo si no hay señal positiva.
  if (bestScore === 0) {
    if (NEGATIVE_HINTS.some((hint) => matchesKeyword(name, hint))) return "MATERIAL";
  }
  return best;
}

/**
 * Clasifica una fila: celda de categoría válida → esa; si no → inferida.
 * `inferred=true` significa que el clasificador tomó la decisión (WARNING).
 */
export function classify(
  name: string,
  rawCategory?: string,
): CategoryResult {
  const fromCell = rawCategory ? normalizeCategoryCell(rawCategory) : null;
  if (fromCell) {
    return { category: fromCell, inferred: false };
  }
  return { category: inferCategory(name), inferred: true };
}