/**
 * Tipos del Pipeline Inteligente de Importación Universal de APUs e Insumos.
 *
 * Fase 1 (PREVIEW) produce `ImportPreview` (solo memoria, sin efectos).
 * Fase 2 (IMPORTACIÓN) recibe `mapping` + `rows` (aunque el cliente los haya
 * editado) y los **revalida por completo** antes de tocar PostgreSQL.
 *
 * Convenciones:
 * - Nada de `any`. Cada valor normalizado es `string` (los Decimal/Date de
 *   Prisma se serializan como texto antes de cruzar a un Client Component).
 * - `values` usa campos internos (`targetField`); `raw` conserva el original.
 */
import type { ApuItemCategoryValue } from "@/lib/construction/apu-engine";

/** Formato de archivo aceptado por el pipeline. */
export type ImportFileKind = "xlsx" | "csv" | "txt";

/** Qué representa cada fila normalizada. */
export type ImportRowKind = "item" | "activity";

/** Estado final de una fila procesada. */
export type ParsedRowStatus = "OK" | "WARNING" | "OMIT";

/** Campo interno del catálogo NEXUS. */
export type ImportTargetField =
  | "code"
  | "name"
  | "unit"
  | "unitPrice"
  | "quantity"
  | "category"
  /** Campos de bloques APU (modo actividad). */
  | "activityCode"
  | "activityName"
  | "activityUnit"
  /** Líneas de composición serializadas (JSON) en bloques APU. */
  | "linesJson"
  /** Columna de sección (MATERIALES:/EQUIPO:/MANO de OBRA:) en bloques APU. */
  | "section";

/** Columna material del archivo (detectada o candidata). */
export interface ImportColumn {
  index: number;
  header: string;
  sample: string;
}

/** Coincidencia columna-de-archivo → campo-NEXUS. */
export interface ColumnMapping {
  sourceColumn: number;
  sourceHeader: string;
  targetField: ImportTargetField;
  /** 0–100: 100 exacta, 90 normalizada, 75 difusa fuerte, 50 débil, 0 no detectada. */
  confidence: number;
  /** True cuando el match fue fuzzy/inferido (la UI lo resalta). */
  needsAttention: boolean;
}

/** Línea de composición dentro de un bloque APU (modo actividad). */
export interface ApuImportLine {
  name: string;
  unit: string;
  quantity: string;
  price: string;
  category?: ApuItemCategoryValue;
}

/** Fila normalizada del preview. Serializable de punta a punta. */
export interface ParsedRow {
  /** Índice dentro del archivo (trazabilidad). */
  index: number;
  kind: ImportRowKind;
  /** Valores originales por índice de columna útil (nunca se descarta). */
  raw: Record<number, string>;
  /** Valores normalizados por campo NEXUS. */
  values: Partial<Record<ImportTargetField, string>>;
  status: ParsedRowStatus;
  /** Razón legible cuando status !== OK. */
  reason?: string;
  warnings: string[];
  /** Categoría inferida o proveniente del archivo. */
  category?: ApuItemCategoryValue;
}

/** Advertencia global o por fila. */
export interface ImportWarning {
  rowIndex?: number;
  severity: "info" | "warning" | "error";
  message: string;
}

/** Métricas del análisis (para el panel de la UI). */
export interface ImportMetrics {
  totalRows: number;
  validRows: number;
  warningRows: number;
  omittedRows: number;
  detectedItems: number;
  detectedActivities: number;
  detectedColumns: number;
  mappedColumns: number;
  inferredCategories: number;
  priceOutliers: number;
}

/** Score de confianza determinístico (0–100). */
export interface ConfidenceScore {
  value: number;
  level: "high" | "medium" | "low";
  label: string;
  breakdown: {
    columns: number;
    priceValidity: number;
    rows: number;
    anomalies: number;
    categories: number;
  };
}

/** Resultado de la Fase 1 — PREVIEW (sin efectos secundarios). */
export interface ImportPreview {
  fileName: string;
  fileSize: number;
  fileKind: ImportFileKind;
  separator?: string;
  blockMode: boolean;
  /** Columnas detectadas (para el editor de mapeo). */
  columns: ImportColumn[];
  mapping: ColumnMapping[];
  rows: ParsedRow[];
  metrics: ImportMetrics;
  confidence: ConfidenceScore;
  warnings: ImportWarning[];
  errors: string[];
  /** Cambios de campo detectados en insumos existentes (requiere DB). */
  fieldChanges?: FieldChange[];
  /** Cambios de precio detectados en insumos existentes (requiere DB). */
  priceChanges?: PriceChange[];
}

/** Cambio de precio detectado en insumo existente. */
export interface PriceChange {
  itemId: string;
  code: string | null;
  name: string;
  currentPrice: string;
  newPrice: string;
  variationPct: number; // (new - current) / current * 100
}

/** Cambio de campo (nombre, unidad, categoría) en insumo existente. */
export interface FieldChange {
  itemId: string;
  code: string | null;
  field: "name" | "unit" | "category";
  currentValue: string;
  newValue: string;
}

/** Reporte de la Fase 2 — IMPORTACIÓN (transaccional). */
export interface ImportResult {
  createdItems: number;
  updatedItems: number;
  createdActivities: number;
  updatedActivities: number;
  createdCompositions: number;
  omittedRows: number;
  warnings: number;
  errors: string[];
  totalProcessed: number;
  priceChanges: PriceChange[];
}

/** Plan de ejecución validado listo para importación transaccional. */


/** Ítem planificado listo para upsert. */
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

/** Actividad planificada lista para upsert. */
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
  skipReason?: string;
}

export interface ExecutionPlan {
  items: PlannedItem[];
  activities: PlannedActivity[];
  skippedRows: number;
  warnings: ImportWarning[];
}
