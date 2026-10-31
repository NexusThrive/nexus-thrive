/**
 * Detector de anomalías por fila + outliers de precio (IQR × 5).
 *
 * Política (reglas del producto):
 * - OMIT solo cuando no hay forma razonable de interpretar la fila
 *   (nombre vacío, precio inválido/no positivo, unidad porcentual/recargo).
 * - WARNING para valores atípicos (no se elimina información válida).
 * - Outliers IQR: se requiere ≥ 6 precios válidos y varianza (>1 valor distinto);
 *   umbral = Q3 + 5 × IQR. Con pocos/iguales/nulos datos no se marca nada.
 */
import { normalizeNumber } from "./fuzzy-matcher";

export interface RowAnomaly {
  status: "OK" | "WARNING" | "OMIT";
  reason?: string;
  warnings: string[];
}

const PERCENT_RE = /%|porcentaje|recargo|herramienta menor/i;

/** Anomalías por fila (campos ya extraídos y normalizados). */
export function detectRowAnomaly(input: {
  name: string;
  unit: string;
  price: string | null;
  quantity: string | null;
}): RowAnomaly {
  const warnings: string[] = [];

  if (!input.name) {
    return { status: "OMIT", reason: "Campo nombre vacío", warnings };
  }
  if (PERCENT_RE.test(input.name) || PERCENT_RE.test(input.unit)) {
    return {
      status: "OMIT",
      reason: "Fila porcentual/recargo (no es un insumo ni una actividad)",
      warnings,
    };
  }
  if (input.price === null) {
    return { status: "OMIT", reason: "Precio inválido o inexistente", warnings };
  }
  const price = Number(input.price);
  if (!Number.isFinite(price) || price <= 0) {
    return { status: "OMIT", reason: "Precio no positivo", warnings };
  }
  if (input.quantity !== null && input.quantity !== "") {
    const quantity = Number(input.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        status: "OMIT",
        reason: "Cantidad/rendimiento no positivo",
        warnings,
      };
    }
  }

  return { status: "OK", warnings };
}

/** Percentil p (0-100) de un arreglo ordenado. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = ((sorted.length - 1) * p) / 100;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] as number;
  const weight = index - lower;
  return (sorted[lower] as number) * (1 - weight) + (sorted[upper] as number) * weight;
}

/**
 * Precios atípicos (índices de fila). Devuelve un Set de índices de entrada.
 * `prices` alineado con las filas: los valores no válidos deben ir como null.
 */
export function detectPriceOutliers(prices: Array<string | null>): Set<number> {
  const outliers = new Set<number>();
  const valid = prices
    .map((p, i) => ({ p: p === null ? null : Number(p), i }))
    .filter((x): x is { p: number; i: number } => x.p !== null && Number.isFinite(x.p) && x.p > 0);

  if (valid.length < 6) return outliers;

  const sorted = valid.map((x) => x.p).sort((a, b) => a - b);
  if (sorted[0] === sorted[sorted.length - 1]) return outliers; // todos iguales

  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  if (iqr === 0) return outliers;

  const highThreshold = q3 + 5 * iqr;
  for (const { p, i } of valid) {
    if (p > highThreshold) outliers.add(i);
  }
  return outliers;
}

/** Recalcula outliers sobre strings (helper para el plan de ejecución). */
export function pricesFromTexts(texts: string[]): Array<string | null> {
  return texts.map((t) => normalizeNumber(t));
}