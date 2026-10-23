/**
 * Score de confianza determinístico (0–100) del análisis.
 *
 * Fórmula documentada:
 *   score = 0.30×columns + 0.30×priceValidity + 0.20×rows + 0.20×categories
 *           − penalty(anomalías)
 *   columns        = promedio de confianza de las columnas mapeadas
 *                    (solo campos relevantes ya detectados).
 *   priceValidity  = % de filas no-omitidas con precio válido (o 100 en
 *                    bloques con líneas).
 *   rows           = % de filas OK/WARNING sobre el total.
 *   categories     = 100 − 60%×(% de categorías inferidas), tope 40 de castigo.
 *   penalty        = omitted×3 + outliers×2, tope 30.
 *
 * Niveles: ≥85 Alta confianza · ≥65 Requiere revisión · <65 Corrección manual.
 */
import type {
  ColumnMapping,
  ConfidenceScore,
  ImportMetrics,
  ParsedRow,
} from "./types";

const IMPORTANT_FIELDS = new Set([
  "name",
  "unitPrice",
  "unit",
  "code",
  "quantity",
]);

export function computeConfidence(input: {
  mapping: ColumnMapping[];
  rows: ParsedRow[];
  metrics: ImportMetrics;
  blockMode: boolean;
}): ConfidenceScore {
  const { mapping, rows, metrics } = input;

  // 1. columns: promedio de match de campos importantes ya presentes.
  const relevant = mapping.filter((m) => IMPORTANT_FIELDS.has(m.targetField));
  const columnsScore =
    relevant.length > 0
      ? relevant.reduce((sum, m) => sum + m.confidence, 0) / relevant.length
      : 0;

  // 2. priceValidity: precios válidos sobre filas no omitidas (item mode).
  let priceValidity = 0;
  if (input.blockMode) {
    const blocksWithLines = rows.filter(
      (r) => r.kind === "activity" && r.values.linesJson && r.values.linesJson.length > 2,
    ).length;
    priceValidity =
      rows.length > 0 ? Math.round((blocksWithLines / rows.length) * 100) : 0;
  } else {
    const nonOmitted = Math.max(1, rows.length - metrics.omittedRows);
    const validPrices = rows.filter((r) => {
      const price = r.values.unitPrice;
      return price !== undefined && price !== "" && Number(price) > 0;
    }).length;
    priceValidity = Math.min(100, Math.round((validPrices / nonOmitted) * 100));
  }

  // 3. rows: filas interpretables.
  const rowsScore =
    rows.length > 0
      ? Math.round(((rows.length - metrics.omittedRows) / rows.length) * 100)
      : 0;

  // 4. categories: castigo por inferencia.
  const inferredPenalty =
    rows.length > 0
      ? Math.min(40, (metrics.inferredCategories / rows.length) * 100 * 0.6)
      : 0;
  const categoriesScore = Math.max(0, 100 - inferredPenalty);

  // 5. penalty anomalías.
  const penalty = Math.min(30, metrics.omittedRows * 3 + metrics.priceOutliers * 2);

  const raw =
    0.3 * columnsScore +
    0.3 * priceValidity +
    0.2 * rowsScore +
    0.2 * categoriesScore -
    penalty;
  const value = Math.max(0, Math.min(100, Math.round(raw)));

  let level: ConfidenceScore["level"];
  let label: string;
  if (value >= 85) {
    level = "high";
    label = "Alta confianza — listo para importar";
  } else if (value >= 65) {
    level = "medium";
    label = "Requiere revisión — revisa los avisos antes de confirmar";
  } else {
    level = "low";
    label = "Corrección manual requerida — ajusta el mapeo o el archivo";
  }

  return {
    value,
    level,
    label,
    breakdown: {
      columns: Math.round(columnsScore),
      priceValidity,
      rows: rowsScore,
      anomalies: penalty,
      categories: Math.round(categoriesScore),
    },
  };
}