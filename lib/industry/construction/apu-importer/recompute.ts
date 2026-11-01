/**
 * Re-derivación de filas para el EDITOR DE MAPEO (client component).
 *
 * Al cambiar el mapeo en la UI no se reenvía el archivo: se re-derivan los
 * `ParsedRow` desde `raw` + mapping nuevo, con las mismas reglas del server.
 * Este módulo es intencionalmente liviano (sin `parser.ts` → sin xlsx) para
 * poder importarse desde un Client Component sin inflar el bundle.
 */
import { normalizeNumber, normalizeUnit } from "./fuzzy-matcher";
import { classify } from "./category-classifier";
import { detectRowAnomaly, detectPriceOutliers } from "./anomaly-detector";
import { computeConfidence } from "./confidence-score";
import type {
  ColumnMapping,
  ImportMetrics,
  ImportPreview,
  ImportTargetField,
  ParsedRow,
} from "./types";

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cellFromMapping(
  row: string[],
  mapping: ColumnMapping[],
  field: ImportTargetField,
): string {
  const m = mapping.find((x) => x.targetField === field);
  if (!m) return "";
  return (row[m.sourceColumn] ?? "").trim();
}

/** Reconstruye la fila cruda (celdas por columna útil) desde un ParsedRow. */
export function rawRowToCellArray(row: ParsedRow, mapping: ColumnMapping[]): string[] {
  const maxCol = mapping.reduce((acc, m) => Math.max(acc, m.sourceColumn), 0);
  const cells: string[] = new Array(maxCol + 1).fill("");
  for (const [col, value] of Object.entries(row.raw)) {
    cells[Number(col)] = value;
  }
  return cells;
}

/** Re-deriva las filas (modo plano) con un mapping nuevo. Pura. */
export function recomputeItemRows(
  mapping: ColumnMapping[],
  rows: ParsedRow[],
): ParsedRow[] {
  const recomputed: ParsedRow[] = [];
  const pricesForOutliers: Array<string | null> = [];

  for (const row of rows) {
    if (row.kind !== "item") {
      recomputed.push(row);
      continue;
    }
    const cells = rawRowToCellArray(row, mapping);

    const name = collapseSpaces(cellFromMapping(cells, mapping, "name"));
    const code = cellFromMapping(cells, mapping, "code").trim().toUpperCase().replace(/\s+/g, " ");
    const unit = normalizeUnit(cellFromMapping(cells, mapping, "unit"));
    const unitPrice = normalizeNumber(cellFromMapping(cells, mapping, "unitPrice")) ?? "";
    const quantityRaw = cellFromMapping(cells, mapping, "quantity");
    const quantity = quantityRaw === "" ? "" : (normalizeNumber(quantityRaw) ?? "");
    const categoryRaw = cellFromMapping(cells, mapping, "category");

    const classification = classify(name, categoryRaw || undefined);
    const anomaly = detectRowAnomaly({
      name,
      unit,
      price: unitPrice || null,
      quantity: quantity || null,
    });

    const warnings = [...anomaly.warnings];
    if (classification.inferred && name) {
      warnings.push("Categoría inferida automáticamente");
    }

    const parsed: ParsedRow = {
      index: row.index,
      kind: "item",
      raw: row.raw,
      values: {
        code: code || undefined,
        name: name || undefined,
        unit: unit || undefined,
        unitPrice: unitPrice || undefined,
        quantity: quantity || undefined,
        category: classification.inferred ? undefined : classification.category,
      },
      status: anomaly.status,
      reason: anomaly.reason,
      warnings,
      category: classification.category,
    };

    recomputed.push(parsed);
    pricesForOutliers.push(anomaly.status === "OMIT" ? null : (unitPrice || null));
  }

  const outlierIndexes = detectPriceOutliers(pricesForOutliers);
  recomputed.forEach((row, i) => {
    if (row.kind === "item" && outlierIndexes.has(i)) {
      row.status = "WARNING";
      row.reason = "Precio atípico (outlier)";
      row.warnings.push("Precio atípico respecto al resto del archivo");
    }
  });
  return recomputed;
}

/** Métricas a partir de filas (misma lógica que server-side). */
export function recomputeMetrics(rows: ParsedRow[]): ImportMetrics {
  const metrics: ImportMetrics = {
    totalRows: rows.length,
    validRows: 0,
    warningRows: 0,
    omittedRows: 0,
    detectedItems: 0,
    detectedActivities: 0,
    detectedColumns: 0,
    mappedColumns: 0,
    inferredCategories: 0,
    priceOutliers: 0,
  };
  for (const row of rows) {
    if (row.status === "OK") metrics.validRows += 1;
    else if (row.status === "WARNING") metrics.warningRows += 1;
    else metrics.omittedRows += 1;
    if (row.kind === "item") metrics.detectedItems += 1;
    else metrics.detectedActivities += 1;
    if (row.warnings.some((w) => w.includes("Categoría inferida"))) {
      metrics.inferredCategories += 1;
    }
    if (row.warnings.some((w) => w.includes("atípico"))) {
      metrics.priceOutliers += 1;
    }
  }
  return metrics;
}

/** Preview actualizado tras reeditar el mapeo. Pura. */
export function recomputePreview(
  preview: ImportPreview,
  mapping: ColumnMapping[],
): ImportPreview {
  if (preview.blockMode) {
    return { ...preview, mapping };
  }
  const rows = recomputeItemRows(mapping, preview.rows);
  const metrics = {
    ...recomputeMetrics(rows),
    detectedColumns: preview.metrics.detectedColumns,
    mappedColumns: mapping.length,
  };
  return {
    ...preview,
    mapping,
    rows,
    metrics,
    confidence: computeConfidence({ mapping, rows, metrics, blockMode: false }),
  };
}