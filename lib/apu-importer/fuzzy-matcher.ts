/**
 * Coincidencia difusa de columnas + normalización de valores.
 *
 * Estructura:
 * - `normalizeHeader` / `normalizeText`  → texto plano para comparar.
 * - `normalizeNumber`                    → números latinos ("1.250,50" → "1250.5").
 * - `normalizeUnit`                      → unidades a canónicas NEXUS (APU_UNITS).
 * - `matchColumns`                       → columnas del archivo → campos NEXUS.
 *
 * Los scores de coincidencia son determinísticos:
 *   100 igualdad exacta · 90 igualdad normalizada · 75 difusa fuerte ·
 *   50 difusa débil · 0 sin coincidencia.
 */
import { APU_UNITS, isValidCategory, type ApuItemCategoryValue } from "@/lib/apu-engine";
import type { ColumnMapping, ImportTargetField } from "./types";

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

/** Quita acentos y signos diacríticos (NFD). */
export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Normaliza texto: minúsculas, sin acentos, alfanumérico separado por espacios. */
export function normalizeText(value: string): string {
  return stripAccents(value.toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Máscara para comparar strings de distinta longitud (normalizada). */
function tokens(value: string): string[] {
  return normalizeText(value).split(" ").filter(Boolean);
}

/** Dice si un texto tiene un solo token (para no fingir coincidencias cortas). */
function hasSingleToken(value: string): boolean {
  return tokens(value).length <= 1;
}

/* ------------------------------------------------------------------ */
/* Números latinos                                                     */
/* ------------------------------------------------------------------ */

const NUMBER_CLEAN = /[^0-9.,+\-]/g;

/**
 * Normaliza números en formato latino o anglosajón a "1234.56".
 * Maneja: "1.250,50", "1250,5", "1,250.50", "$ 45.000", "3,5%".
 * Devuelve null si no se puede extraer un número válido.
 */
export function normalizeNumber(raw: string): string | null {
  if (!raw) return null;
  let value = String(raw).trim().replace(NUMBER_CLEAN, "");
  if (!value) return null;

  // Porcentaje: si la celda original contiene "%", es un recargo → no es precio.
  if (/%/i.test(raw.trim())) return null;

  if (value.includes(",") && value.includes(".")) {
    // Ambos separadores: el último es el decimal.
    const decimalPos = Math.max(value.lastIndexOf(","), value.lastIndexOf("."));
    const decimalChar = value[decimalPos];
    const thousands = decimalChar === "," ? "." : ",";
    value = value.split(thousands).join("").replace(decimalChar, ".");
  } else if (value.includes(",") && !value.includes(".")) {
    // Solo coma: decimal (estándar latino).
    value = value.replace(",", ".");
  } else if (value.includes(".")) {
    // Solo punto: ambiguo. Si termina en ".DDD" con 3 dígitos → separador de miles.
    if (/\.\d{3}$/.test(value)) {
      value = value.replace(/\./g, "");
    }
    // De lo contrario ya es "1234.56" válido.
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  // Conserva hasta 6 decimales sin exponentes (serializable para Decimal Prisma).
  return parsed.toFixed(6).replace(/\.?0+$/, "") || "0";
}

/* ------------------------------------------------------------------ */
/* Unidades                                                            */
/* ------------------------------------------------------------------ */

const UNIT_SYNONYMS: Record<string, string> = {
  // singular/plural y variantes comunes → canónica NEXUS
  m3: "M3", mt3: "M3", "m³": "M3", m3k: "M3", mc: "M3",
  metro: "M", metros: "M", mtr: "M", mlineal: "M", ml: "M",
  m2: "M2", mt2: "M2", "m²": "M2",
  kg: "KG", kilo: "KG", kilos: "KG", kilogramo: "KG", kilogramos: "KG",
  und: "UND", un: "UND", ",": "UND", unidad: "UND", unidades: "UND", unid: "UND",
  hr: "HR", hora: "HR", horas: "HR", h: "HR",
  bulto: "BULTO", bultos: "BULTO", bol: "BULTO", bolitos: "BULTO",
  glb: "GLB", global: "GLB",
  l: "L", lt: "L", litro: "L", litros: "L", dm3: "L",
  cm: "CM", cml: "CM",
  pza: "PZA", pieza: "PZA", piezas: "PZA",
  dia: "DIA", "días": "DIA", "dias": "DIA",
  mes: "MES", "meses": "MES",
  gal: "GAL", galon: "GAL", galones: "GAL",
  par: "PAR",
  jgo: "JGO", juego: "JGO", juegos: "JGO",
  km: "KM", "km2": "KM",
  ha: "HA", hectarea: "HA", hectareas: "HA",
  vi: "VIAJE", via: "VIAJE", viajes: "VIAJE", "vje": "VIAJE",
  "m3-km": "M3KM", "m3km": "M3KM",
};

/** Unidades canónicas aceptadas por el motor (APU_UNITS de apu-engine). */
const CANONICAL_UNITS = new Set<string>(APU_UNITS);

/**
 * Normaliza una unidad escrita en el archivo a una canónica NEXUS.
 * Devuelve "" cuando no se reconoce (el call site decide si omitir).
 */
export function normalizeUnit(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";

  const clean = normalizeText(trimmed).replace(/\s+/g, "");
  const upper = clean.toUpperCase();

  if (CANONICAL_UNITS.has(upper)) return upper;
  const synonym = UNIT_SYNONYMS[clean];
  if (synonym && CANONICAL_UNITS.has(synonym)) return synonym;

  return "";
}

/* ------------------------------------------------------------------ */
/* Columnas (headers)                                                  */
/* ------------------------------------------------------------------ */

/** Sinónimos por cada campo NEXUS (normalizados al comparar). */
const FIELD_SYNONYMS: Record<ImportTargetField, string[]> = {
  code: ["codigo", "cod", "id", "referencia", "ref", "sku", "item", "insumo"],
  name: ["descripcion", "descripcion del insumo", "descripcion insumo", "nombre", "detalle", "concepto", "actividad", "descripcion de la actividad", "insumo"],
  unit: ["unidad", "und", "un", "u", "um"],
  unitPrice: ["precio unitario", "valor unitario", "precio", "valor", "costo unitario", "costo", "vr unitario", "vr", "precio. unitario", "precio del insumo"],
  quantity: ["cantidad", "cant", "rendimiento", "rend", "consumo", "cant/rend", "cantidad/rendimiento", "n", "unid"],
  category: ["categoria", "tipo", "clasificacion", "grupo", "rubro"],
  activityCode: ["codigo actividad", "cod actividad", "codact", "actividad codigo"],
  activityName: ["nombre actividad", "actividad nombre", "descripcion actividad", "actividad"],
  activityUnit: ["unidad actividad", "unidad de la actividad"],
  linesJson: [],
  section: ["seccion", "tipo de insumo"],
};

const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las", "un", "una", "por", "o", "y", "a"]);

/** Palabras clave de una frase normalizada (sin stopwords). */
function significantTokens(value: string): string[] {
  return tokens(value).filter((w) => !STOPWORDS.has(w) && w.length >= 2);
}

/** Similitud de Jaccard entre dos conjuntos de tokens significativos. */
function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const union = new Set(a);
  for (const t of b) union.add(t);
  const intersection = a.filter((t) => setB.has(t)).length;
  return intersection / union.size;
}

/** Score de coincidencia de un header contra un campo NEXUS (0–100). */
export function matchHeaderToField(header: string, field: ImportTargetField): number {
  const normalized = normalizeText(header);
  if (!normalized) return 0;

  // Exact match of field name itself (e.g., "code" matches "code" field)
  if (normalizeText(field) === normalizeText(header)) return 100;

  const synonyms = FIELD_SYNONYMS[field];
  for (const synonym of synonyms) {
    const normSyn = normalizeText(synonym);
    if (!normSyn) continue;
    if (normalized === normSyn) return 100;
    if (normalized.startsWith(normSyn + " ") || normalized.endsWith(" " + normSyn)) {
      // "precio unitario (COP)" o "(Col) descripcion"
      return 90;
    }
  }

  if (field === "name" && hasSingleToken(header)) return 0; // evitar falsos "desc".

  const sig = significantTokens(normalized);
  if (sig.length === 0) return 0;

  let best = 0;
  for (const synonym of synonyms) {
    const normSyn = normalizeText(synonym);
    if (!normSyn) continue;
    const synTokens = significantTokens(normSyn);
    if (synTokens.length === 0) continue;
    const sim = jaccard(sig, synTokens);
    const contains =
      normalized.includes(normSyn) && normSyn.length >= 3 &&
      (normalized.length - normSyn.length) <= 12;
    // Un token compartido y corto → débil; overlap fuerte → fuerte.
    const singleHit = sig.some((t) => normSyn === t || normSyn.startsWith(t) || t.startsWith(normSyn));
    if (sim >= 0.6 || contains) {
      best = Math.max(best, 75);
    } else if (singleHit) {
      best = Math.max(best, 50);
    }
  }
  return best;
}

/**
 * Coincidencia columnas del archivo → campos NEXUS.
 * `required` define el orden de prioridad; cada columna se asigna a un solo campo.
 */
export function matchColumns(
  headers: string[],
  required: ImportTargetField[],
): ColumnMapping[] {
  const usedColumns = new Set<number>();
  const result: ColumnMapping[] = [];

  for (const field of required) {
    let bestColumn = -1;
    let bestScore = 0;
    headers.forEach((header, index) => {
      if (usedColumns.has(index)) return;
      if (normalizeText(header) === "") return; // columnas vacías ya tomadas antes de usar? mejor: skip empty
      const score = matchHeaderToField(header, field);
      if (score > bestScore) {
        bestScore = score;
        bestColumn = index;
      }
    });

    if (bestColumn >= 0 && bestScore >= 50) {
      usedColumns.add(bestColumn);
      result.push({
        sourceColumn: bestColumn,
        sourceHeader: headers[bestColumn] ?? "",
        targetField: field,
        confidence: bestScore,
        needsAttention: bestScore < 90,
      });
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Categorías                                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_SYNONYMS: Record<string, ApuItemCategoryValue> = {
  material: "MATERIAL", materiales: "MATERIAL", mat: "MATERIAL", matl: "MATERIAL",
  "mano de obra": "MANO_DE_OBRA", "mano de obra%": "MANO_DE_OBRA", mo: "MANO_DE_OBRA",
  "mano-obra": "MANO_DE_OBRA", mano: "MANO_DE_OBRA", jornal: "MANO_DE_OBRA",
  equipo: "EQUIPO", equipos: "EQUIPO", eq: "EQUIPO", "equipo y herramientas": "EQUIPO",
  herramienta: "EQUIPO", herramientas: "EQUIPO",
  transporte: "TRANSPORTE", transportes: "TRANSPORTE", flete: "TRANSPORTE",
  acarreo: "TRANSPORTE", transp: "TRANSPORTE",
};

/** Categoría si la celda del archivo es reconocible; null si no. */
export function normalizeCategoryCell(raw: string): ApuItemCategoryValue | null {
  const clean = normalizeText(raw).replace(/\s+/g, "");
  if (!clean) return null;

  if (isValidCategory(clean)) return clean as ApuItemCategoryValue;
  const synonym = CATEGORY_SYNONYMS[clean];
  return synonym ?? null;
}

/**
 * Puntaje de similitud entre una cadena conocida y texto libre
 * (usado por el clasificador para keywords con ruido tipo "MANO DE OBRA (30%)").
 */
export function matchesKeyword(name: string, keyword: string): boolean {
  const n = normalizeText(name);
  const k = normalizeText(keyword);
  if (k.length < 2) return false;
  return n.includes(k) || (n.length < 40 && jaccard(significantTokens(n), significantTokens(k)) >= 0.5);
}