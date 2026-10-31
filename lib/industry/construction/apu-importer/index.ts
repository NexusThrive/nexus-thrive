/**
 * Orquestador del Pipeline Inteligente de Importación.
 *
 * Fase 1 — `analyzeFile`: buffer + nombre → `ImportPreview` (puro, sin DB).
 * Fase 2 — `buildExecutionPlan`: mapping + rows (posiblemente editados por el
 * cliente) → plan normalizado/validado DE NUEVO antes de tocar PostgreSQL.
 *
 * El plan nunca confía en `values` enviados por la UI: re-deriva cada valor
 * desde `raw` + mapping y re-clasifica/re-anomaliza cada fila.
 */
import {
  normalizeNumber,
  normalizeUnit,
  matchHeaderToField,
} from "./fuzzy-matcher";
import type {
  ColumnMapping,
  ImportColumn,
  ParsedRow,
  ImportPreview,
  ImportMetrics,
  ImportTargetField,
  ApuImportLine,
} from "./types";
import type { FieldChange, PriceChange } from "./types";

import { classify } from "./category-classifier";
import { detectRowAnomaly, detectPriceOutliers } from "./anomaly-detector";
import { computeConfidence } from "./confidence-score";
import { parseFile, splitBlocks, MAX_ROWS } from "./parser";

/** Celdas mínimas para considerar una fila como encabezado (modo plano). */
const HEADER_MIN_MATCHES = 2;
const HEADER_SCORE_MIN = 50;
/** Tope de advertencias agregadas para mantener el preview liviano. */
const MAX_AGGREGATED_WARNINGS = 100;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

/** Lee la columna mapeada de una fila cruda. */
function cellFromMapping(
  row: string[],
  mapping: ColumnMapping[],
  field: ImportTargetField,
): string {
  const m = mapping.find((x) => x.targetField === field);
  if (!m) return "";
  return (row[m.sourceColumn] ?? "").trim();
}

/** Columna para el editor: header real o etiqueta + muestra de la primera fila. */
function buildColumns(
  rows: string[][],
  dataStart: number,
  headers: string[] | null,
): ImportColumn[] {
  const maxCol = Math.max(
    ...rows.slice(dataStart).map((r) => r.length),
    headers?.length ?? 0,
    1,
  );
  const columns: ImportColumn[] = [];
  for (let c = 0; c < maxCol; c += 1) {
    const header = headers?.[c]?.trim() ?? "";
    let sample = "";
    for (let r = dataStart; r < Math.min(rows.length, dataStart + 3); r += 1) {
      const cell = (rows[r] as string[])[c]?.trim() ?? "";
      if (cell) {
        sample = cell;
        break;
      }
    }
    columns.push({
      index: c,
      header: header || (sample ? "Columna " + (c + 1) : ""),
      sample,
    });
  }
  return columns;
}

/** Detecta la fila de encabezado en modo plano (scores de sinónimos). */
function findHeaderRow(rows: string[][]): number {
  let bestIndex = -1;
  let bestScore = 0;
  const candidateFields: ImportTargetField[] = [
    "code", "name", "unit", "unitPrice", "quantity", "category",
  ];

  for (let r = 0; r < Math.min(rows.length, 15); r += 1) {
    const cells = rows[r] as string[];
    let score = 0;
    let matches = 0;
    for (const cell of cells) {
      if (!cell.trim()) continue;
      const fieldScore = Math.max(
        ...candidateFields.map((f) => matchHeaderToField(cell, f)),
      );
      if (fieldScore >= HEADER_SCORE_MIN) {
        score += fieldScore;
        matches += 1;
      }
    }
    if (matches >= HEADER_MIN_MATCHES && score > bestScore) {
      bestScore = score;
      bestIndex = r;
    }
  }
  return bestIndex;
}

/** Extrae valores normalizados de una fila plana (re-derivación completa). */
function valuesFromItemRow(
  row: string[],
  mapping: ColumnMapping[],
): { name: string; code: string; unit: string; unitPrice: string; quantity: string; categoryRaw: string } {
  const name = collapseSpaces(cellFromMapping(row, mapping, "name"));
  const code = normalizeCode(cellFromMapping(row, mapping, "code"));
  const unit = cellFromMapping(row, mapping, "unit");
  const unitPriceRaw = cellFromMapping(row, mapping, "unitPrice");
  const quantityRaw = cellFromMapping(row, mapping, "quantity");
  const categoryRaw = cellFromMapping(row, mapping, "category");

  return {
    name,
    code,
    unit: normalizeUnit(unit),
    unitPrice: normalizeNumber(unitPriceRaw) ?? "",
    quantity: quantityRaw === "" ? "" : (normalizeNumber(quantityRaw) ?? ""),
    categoryRaw,
  };
}

/* ------------------------------------------------------------------ */
/* Fase 1 — PREVIEW                                                    */
/* ------------------------------------------------------------------ */

export function analyzeFile(params: {
  buffer: ArrayBuffer;
  fileName: string;
  fileSize: number;
}): ImportPreview {
  const errors: string[] = [];
  const parsed = parseFile({ buffer: params.buffer, fileName: params.fileName });
  const rows = parsed.rows;

  if (rows.length === 0) {
    return {
      fileName: params.fileName,
      fileSize: params.fileSize,
      fileKind: parsed.fileKind,
      blockMode: false,
      columns: [],
      mapping: [],
      rows: [],
      metrics: emptyMetrics(),
      confidence: computeConfidence({ mapping: [], rows: [], metrics: emptyMetrics(), blockMode: false }),
      warnings: [],
      errors: ["El archivo no contiene filas con datos."],
    };
  }
  if (rows.length === MAX_ROWS) {
    errors.push(`El archivo supera el límite de ${MAX_ROWS} filas; se analizó el primer bloque.`);
  }

  if (parsed.blockMode) {
    return analyzeBlocks(parsed, params.fileSize, errors);
  }
  return analyzeFlat(parsed, params.fileSize, errors);
}

function emptyMetrics(): ImportMetrics {
  return {
    totalRows: 0,
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
}

function analyzeFlat(
  parsed: ReturnType<typeof parseFile>,
  fileSize: number,
  errors: string[],
): ImportPreview {
  const headerIndex = findHeaderRow(parsed.rows);
  const headers =
    headerIndex >= 0 ? (parsed.rows[headerIndex] as string[]) : null;
  const dataStart = headerIndex >= 0 ? headerIndex + 1 : 0;

  const required: ImportTargetField[] = [
    "code", "name", "unit", "unitPrice", "quantity", "category",
  ];

  // Match por columna: si no hay header detectado, probamos verbos sin header.
  const mapping = headers
    ? compileMapping(headers, required)
    : guessMappingBySample(parsed.rows, dataStart, required, errors);

  const detectedColumns = headers
    ? headers.filter((h) => h.trim() !== "").length
    : Math.max(...parsed.rows.slice(dataStart).map((r) => r.length), 0);

  // Columnas para el editor: header si existe; si no, etiqueta + muestra.
  const columns: ImportColumn[] = buildColumns(parsed.rows, dataStart, headers);

  const parsedRows: ParsedRow[] = [];
  const pricesForOutliers: Array<string | null> = [];

  for (let r = dataStart; r < parsed.rows.length; r += 1) {
    const row = parsed.rows[r] as string[];
    if (row.every((c) => c.trim() === "")) continue; // filas vacías

    const values = valuesFromItemRow(row, mapping);
    const classification = classify(values.name, values.categoryRaw || undefined);
    const anomaly = detectRowAnomaly({
      name: values.name,
      unit: values.unit,
      price: values.unitPrice || null,
      quantity: values.quantity || null,
    });

    const warnings: string[] = [...anomaly.warnings];
    if (classification.inferred && values.name) {
      warnings.push("Categoría inferida automáticamente");
    }

    const parsedRow: ParsedRow = {
      index: r,
      kind: "item",
      raw: rawRow(row, mapping),
      values: {
        code: values.code || undefined,
        name: values.name || undefined,
        unit: values.unit || undefined,
        unitPrice: values.unitPrice || undefined,
        quantity: values.quantity || undefined,
        category: classification.inferred ? undefined : classification.category,
      },
      status: anomaly.status,
      reason: anomaly.reason,
      warnings,
      category: classification.category,
    };

    parsedRows.push(parsedRow);
    pricesForOutliers.push(anomaly.status === "OMIT" ? null : (values.unitPrice || null));
  }

  const outlierIndexes = detectPriceOutliers(pricesForOutliers);
  parsedRows.forEach((row, i) => {
    if (outlierIndexes.has(i)) {
      row.status = "WARNING";
      row.reason = "Precio atípico (outlier)";
      row.warnings.push("Precio atípico respecto al resto del archivo");
    }
  });

  const metrics = buildMetrics(parsedRows);
  const warnings = aggregateWarnings(parsedRows);
  errors.forEach((e) => warnings.push({ severity: "error", message: e }));

  return {
    fileName: parsed.fileName,
    fileSize,
    fileKind: parsed.fileKind,
    separator: parsed.separator,
    blockMode: false,
    columns,
    mapping,
    rows: parsedRows,
    metrics: { ...metrics, detectedColumns, mappedColumns: mapping.length },
    confidence: computeConfidence({
      mapping,
      rows: parsedRows,
      metrics: { ...metrics, detectedColumns, mappedColumns: mapping.length },
      blockMode: false,
    }),
    warnings: warnings.slice(0, MAX_AGGREGATED_WARNINGS),
    errors,
  };
}

/** Compila mapping por sinónimos (scores del fuzzy matcher). */
function compileMapping(headers: string[], required: ImportTargetField[]): ColumnMapping[] {
  // Avala cada header contra cada campo; elige el mejor par sin duplicar columnas.
  const used = new Set<number>();
  const result: ColumnMapping[] = [];

  for (const field of required) {
    let best = -1;
    let bestScore = 0;
    headers.forEach((header, index) => {
      if (used.has(index) || !header.trim()) return;
      const score = matchHeaderToField(header, field);
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    });
    if (best >= 0 && bestScore >= HEADER_SCORE_MIN) {
      used.add(best);
      result.push({
        sourceColumn: best,
        sourceHeader: headers[best] as string,
        targetField: field,
        confidence: bestScore,
        needsAttention: bestScore < 90,
      });
    }
  }
  return result;
}

/** Sin header detectado: infiere por la primera fila de datos (con aviso). */
function guessMappingBySample(
  rows: string[][],
  dataStart: number,
  required: ImportTargetField[],
  errors: string[],
): ColumnMapping[] {
  const first = rows[dataStart] as string[] | undefined;
  if (!first) return [];
  // 1) códigos → col 0 si parece código; 2) nombre → col con mayor texto.
  const mapping: ColumnMapping[] = [];
  const codeCol = looksLikeCode(first[0] ?? "") ? 0 : -1;
  if (codeCol >= 0) {
    mapping.push({ sourceColumn: 0, sourceHeader: "col0", targetField: "code", confidence: 50, needsAttention: true });
  }
  let nameCol = 1;
  let maxLen = 0;
  first.forEach((cell, i) => {
    if (i !== codeCol && cell.length > maxLen) {
      maxLen = cell.length;
      nameCol = i;
    }
  });
  mapping.push({ sourceColumn: nameCol, sourceHeader: `col${nameCol}`, targetField: "name", confidence: 50, needsAttention: true });
  const remaining = first
    .map((cell, i) => ({ cell, i }))
    .filter(({ i }) => i !== codeCol && i !== nameCol);
  if (remaining[0]) mapping.push({ sourceColumn: remaining[0].i, sourceHeader: `col${remaining[0].i}`, targetField: "unit", confidence: 50, needsAttention: true });
  if (remaining[1]) mapping.push({ sourceColumn: remaining[1].i, sourceHeader: `col${remaining[1].i}`, targetField: "unitPrice", confidence: 50, needsAttention: true });

  if (codeCol < 0) {
    errors.push("No se detectó encabezado: se usó la primera fila como dato y el mapeo es una estimación.");
  }
  return mapping;
}

function looksLikeCode(value: string): boolean {
  return /^[a-z]{0,3}[- ]?\d{2,}/i.test(value.trim());
}

function rawRow(row: string[], mapping: ColumnMapping[]): Record<number, string> {
  const out: Record<number, string> = {};
  for (const m of mapping) out[m.sourceColumn] = row[m.sourceColumn] ?? "";
  return out;
}

/* ------------------------------------------------------------------ */
/* Modo bloque (master packs)                                          */
/* ------------------------------------------------------------------ */

function analyzeBlocks(
  parsed: ReturnType<typeof parseFile>,
  fileSize: number,
  errors: string[],
): ImportPreview {
  const blocks = splitBlocks(parsed.rows);

  // Encabezado de tabla de líneas del PRIMER bloque con líneas (para el editor).
  const firstBlockWithLines = blocks.find((b) => b.lines.length > 0);
  const lineHeaders = firstBlockWithLines?.lineHeader ?? null;

  const mapping: ColumnMapping[] = [];
  if (lineHeaders) {
    const push = (col: number, header: string, field: ImportTargetField, confidence: number) => {
      if (col < 0) return;
      mapping.push({
        sourceColumn: col,
        sourceHeader: header,
        targetField: field,
        confidence,
        needsAttention: confidence < 90,
      });
    };
    push(lineHeaders.name, "Descripción", "name", 100);
    push(lineHeaders.unit, "Unidad", "unit", 100);
    push(lineHeaders.quantity, "Cant/Rend", "quantity", 100);
    push(lineHeaders.price, "Precio Unitario", "unitPrice", 100);
  }

  const parsedRows: ParsedRow[] = [];

  for (const block of blocks) {
    const normalizedLines: ApuImportLine[] = [];
    let invalidLines = 0;
    for (const line of block.lines) {
      const unit = normalizeUnit(line.unit);
      const quantity = normalizeNumber(line.quantity);
      const price = normalizeNumber(line.price);
      if (!line.name.trim() || price === null || Number(price) <= 0) {
        invalidLines += 1;
        continue;
      }
      normalizedLines.push({
        name: collapseSpaces(line.name),
        unit: unit || "UND",
        quantity: quantity && Number(quantity) > 0 ? quantity : "1",
        price,
        category: line.category ?? undefined,
      });
    }

    const warnings: string[] = [];
    let status: ParsedRow["status"] = "OK";
    let reason: string | undefined;

    if (normalizedLines.length === 0) {
      status = block.name ? "WARNING" : "OMIT";
      reason = block.name ? "Actividad sin líneas válidas" : "Bloque sin nombre ni líneas";
      warnings.push(reason);
    } else if (invalidLines > 0) {
      status = "WARNING";
      reason = `${invalidLines} línea(s) sin precio válido se omitirán`;
      warnings.push(reason);
    }

    const firstCategory = normalizedLines.find((l) => l.category)?.category;

    parsedRows.push({
      index: block.rowIndexes[0] ?? 0,
      kind: "activity",
      raw: {},
      values: {
        activityCode: normalizeCode(block.code) || undefined,
        activityName: block.name || undefined,
        activityUnit: block.unit || undefined,
        linesJson: JSON.stringify(normalizedLines),
        category: firstCategory,
      },
      status,
      reason,
      warnings,
      category: firstCategory,
    });
  }

  const metrics = buildMetrics(parsedRows);
  const warnings = aggregateWarnings(parsedRows);
  errors.forEach((e) => warnings.push({ severity: "error", message: e }));

  return {
    fileName: parsed.fileName,
    fileSize,
    fileKind: parsed.fileKind,
    blockMode: true,
    columns: [],
    mapping,
    rows: parsedRows,
    metrics: {
      ...metrics,
      detectedColumns: mapping.length,
      mappedColumns: mapping.length,
    },
    confidence: computeConfidence({
      mapping,
      rows: parsedRows,
      metrics: { ...metrics, detectedColumns: mapping.length, mappedColumns: mapping.length },
      blockMode: true,
    }),
    warnings: warnings.slice(0, MAX_AGGREGATED_WARNINGS),
    errors,
  };
}

function buildMetrics(rows: ParsedRow[]): ImportMetrics {
  const metrics = emptyMetrics();
  metrics.totalRows = rows.length;
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

function aggregateWarnings(rows: ParsedRow[]): ImportPreview["warnings"] {
  const out: ImportPreview["warnings"] = [];
  for (const row of rows) {
    if (row.status === "OMIT") {
      out.push({
        rowIndex: row.index,
        severity: "warning",
        message: row.reason ?? "Fila omitida",
      });
    } else if (row.status === "WARNING") {
      out.push({
        rowIndex: row.index,
        severity: "warning",
        message: row.reason ?? row.warnings.join("; "),
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Fase 2 — PLAN DE EJECUCIÓN (revalidación)                           */
/* ------------------------------------------------------------------ */

export interface PlannedItem {
  key: string;
  code?: string;
  name: string;
  unit: string;
  unitPrice: string;
  category: ApuImportLine["category"];
  sourceIndex: number;
  skipReason?: string;
}

export interface PlannedActivity {
  key: string;
  code?: string;
  name: string;
  unit: string;
  lines: Array<{
    itemName: string;
    unit: string;
    quantity: string;
    unitPrice: string;
    category?: ApuImportLine["category"];
    skipReason?: string;
  }>;
  sourceIndex: number;
}

export interface ExecutionPlan {
  items: PlannedItem[];
  activities: PlannedActivity[];
  skippedRows: number;
  warnings: string[];
}

/**
 * Revalida mapping + rows y produce el plan de escritura.
 * La UI puede haber editado `values`, pero acá se re-deriva todo desde `raw`
 * (o del payload serializado de líneas en bloques).
 */
export function buildExecutionPlan(input: {
  mapping: ColumnMapping[];
  rows: ParsedRow[];
}): ExecutionPlan {
  const items: PlannedItem[] = [];
  const activities: PlannedActivity[] = [];
  const warnings: string[] = [];
  let skippedRows = 0;

  // Dedupe por clave dentro del mismo archivo.
  const seenItemKeys = new Set<string>();

  for (const row of input.rows) {
    if (row.kind === "item") {
      if (row.status === "OMIT") {
        skippedRows += 1;
        continue;
      }
      const mappingRow: string[] = mappingRowFromRaw(row, input.mapping);
      const values = valuesFromItemRow(mappingRow, input.mapping);
      const classification = classify(values.name, values.categoryRaw || undefined);

      if (!values.name || !values.unitPrice) {
        skippedRows += 1;
        continue;
      }

      const code = values.code || undefined;
      const key = code
        ? `code:${code}`
        : `name:${normalizeTextKey(values.name)}|${values.unit}|${values.unitPrice}`;

      if (seenItemKeys.has(key)) {
        warnings.push(`Fila ${row.index + 1}: duplicado en el archivo, se actualiza el primero.`);
        continue;
      }
      seenItemKeys.add(key);
      items.push({
        key,
        code,
        name: values.name,
        unit: values.unit || "UND",
        unitPrice: values.unitPrice,
        category: classification.category,
        sourceIndex: row.index,
      });
    } else {
      // Actividad: re-deriva desde linesJson (serie de ApuImportLine).
      if (row.status === "OMIT") {
        skippedRows += 1;
        continue;
      }
      let lines: ApuImportLine[] = [];
      const rawLines = row.values.linesJson;
      if (rawLines) {
        try {
          lines = JSON.parse(String(rawLines)) as ApuImportLine[];
        } catch {
          warnings.push(`Fila ${row.index + 1}: líneas de composición ilegibles, actividad vacía.`);
          lines = [];
        }
      }

      const normalizedLines: PlannedActivity["lines"] = [];
      for (const line of lines) {
        const unit = normalizeUnit(line.unit);
        const quantity = normalizeNumber(line.quantity);
        const price = normalizeNumber(line.price);
        if (!line.name.trim() || price === null || Number(price) <= 0) {
          normalizedLines.push({
            itemName: line.name,
            unit: unit || "UND",
            quantity: quantity && Number(quantity) > 0 ? quantity : "1",
            unitPrice: price ?? "",
            skipReason: "Precio inválido",
          });
          continue;
        }
        // Sin dedupe: líneas gemelas legítimas se conservan y la escritura
        // las fusiona por itemId (sumando consumos).
        normalizedLines.push({
          itemName: collapseSpaces(line.name),
          unit: unit || "UND",
          quantity: quantity && Number(quantity) > 0 ? quantity : "1",
          unitPrice: price,
          category: line.category ?? undefined,
        });
      }

      const name = row.values.activityName?.trim() ?? "";
      const unit = row.values.activityUnit ? normalizeUnit(row.values.activityUnit) || row.values.activityUnit.trim() : "UND";
      const code = row.values.activityCode ? normalizeCode(row.values.activityCode) : undefined;

      activities.push({
        key: code ? `code:${code}` : `name:${normalizeTextKey(name)}`,
        code,
        name: name || "Actividad importada",
        unit: unit || "UND",
        lines: normalizedLines,
        sourceIndex: row.index,
      });
    }
  }

  return { items, activities, skippedRows, warnings };
}

function normalizeTextKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mappingRowFromRaw(row: ParsedRow, mapping: ColumnMapping[]): string[] {
  const maxCol = mapping.reduce((acc, m) => Math.max(acc, m.sourceColumn), 0);
  const out: string[] = new Array(maxCol + 1).fill("");
  for (const [col, value] of Object.entries(row.raw)) {
    out[Number(col)] = value;
  }
  return out;
}
/**
 * Computa los cambios de campo y precio comparando un plan de importación con insumos existentes.
 */
export function computeImportChangesFromPlan(
  existingItems: Array<{ id: string; code: string | null; name: string; unit: string; category: string; unitPrice: string }>,
  plan: ExecutionPlan,
): { fieldChanges: FieldChange[]; priceChanges: PriceChange[] } {
  // Normalize existing items' units for fair comparison
  const normalizeItem = (item: typeof existingItems[0]) => ({
    ...item,
    unit: normalizeUnit(item.unit) || item.unit,
  });

  const itemsByCode = new Map<string, typeof existingItems[0]>();
  const itemsByName = new Map<string, typeof existingItems[0]>();
  for (const item of existingItems) {
    const norm = normalizeItem(item);
    if (item.code) itemsByCode.set(item.code.trim().toUpperCase(), norm);
    const nameKey = normalizeTextKey(item.name);
    if (nameKey && !itemsByName.has(nameKey)) itemsByName.set(nameKey, norm);
  }

  const fieldChanges: FieldChange[] = [];
  const priceChanges: PriceChange[] = [];

  for (const item of plan.items) {
    if (item.skipReason) continue;
    const codeKey = item.code ? item.code.trim().toUpperCase() : null;
    const nameKey = normalizeTextKey(item.name);
    
    const existing = codeKey
      ? itemsByCode.get(codeKey)
      : itemsByName.get(nameKey);

    if (existing) {
      // Check field changes
      if (item.name && existing.name !== item.name) {
        fieldChanges.push({
          itemId: existing.id,
          code: existing.code,
          field: "name",
          currentValue: existing.name,
          newValue: item.name,
        });
      }
      if (item.unit && existing.unit !== item.unit) {
        fieldChanges.push({
          itemId: existing.id,
          code: existing.code,
          field: "unit",
          currentValue: existing.unit,
          newValue: item.unit,
        });
      }
      if (item.category && existing.category !== item.category) {
        fieldChanges.push({
          itemId: existing.id,
          code: existing.code,
          field: "category",
          currentValue: existing.category,
          newValue: item.category,
        });
      }
      // Price change
      if (item.unitPrice && String(existing.unitPrice) !== item.unitPrice) {
        const curr = Number(existing.unitPrice);
        const nw = Number(item.unitPrice);
        let variationPct = 0;
        if (curr !== 0) variationPct = ((nw - curr) / curr) * 100;
        priceChanges.push({
          itemId: existing.id,
          code: existing.code,
          name: existing.name,
          currentPrice: String(existing.unitPrice),
          newPrice: item.unitPrice,
          variationPct,
        });
      }
    }
  }

  return { fieldChanges, priceChanges };
}

/**
 * Versión legacy que usa preview (para compatibilidad).
 * Convierte el preview a plan y delega en computeImportChangesFromPlan.
 */
export function computeImportChanges(
  existingItems: Array<{ id: string; code: string | null; name: string; unit: string; category: string; unitPrice: string }>,
  preview: ImportPreview,
): { fieldChanges: FieldChange[]; priceChanges: PriceChange[] } {
  const plan = buildExecutionPlan({ mapping: preview.mapping, rows: preview.rows });
  return computeImportChangesFromPlan(existingItems, plan);
}
