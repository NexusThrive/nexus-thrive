/**
 * Cargador de archivos: xlsx/csv/txt → matriz de celdas (string).
 *
 * - XLSX: primera hoja, `raw:false` (valores formateados) → strings.
 * - CSV/TXT: detección de separador (`,`, `;`, tab) y parser con comillas.
 * - Límites: MAX_ROWS / MAX_COLS / MAX_CELL para proteger el pipeline.
 * - Detecta "modo bloque" (master packs con MATERIALES:/EQUIPO:/MANO de OBRA:)
 *   y particiona en bloques de actividad.
 */
import * as XLSX from "xlsx";
import { normalizeText } from "./fuzzy-matcher";
import type { ImportFileKind, ApuImportLine } from "./types";

export const MAX_ROWS = 50_000;
export const MAX_COLS = 40;
export const MAX_CELL = 400;

export interface ParsedTable {
  fileName: string;
  fileKind: ImportFileKind;
  separator?: string;
  rows: string[][];
  blockMode: boolean;
}

/* ------------------------------------------------------------------ */
/* Delimiters                                                          */
/* ------------------------------------------------------------------ */

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 20).join("\n");
  const counts: Array<[string, number]> = [
    [";", (sample.match(/;/g) ?? []).length],
    [",", (sample.match(/,/g) ?? []).length],
    ["\t", (sample.match(/\t/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  const [best, count] = counts[0] as [string, number];
  return count > 0 ? best : ",";
}

/** Parser CSV pequeño: respeta comillas dobles y comillas escapadas. */
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] as string;
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** Límites de celda/columna: recorta sin tirar el archivo. */
function sanitizeRows(rows: string[][]): string[][] {
  const capped: string[][] = [];
  for (const row of rows.slice(0, MAX_ROWS)) {
    const cappedRow: string[] = [];
    for (let c = 0; c < Math.min(row.length, MAX_COLS); c += 1) {
      cappedRow.push(String(row[c] ?? "").trim().slice(0, MAX_CELL));
    }
    capped.push(cappedRow);
  }
  return capped;
}

/* ------------------------------------------------------------------ */
/* Carga por tipo                                                      */
/* ------------------------------------------------------------------ */

function detectKind(fileName: string): ImportFileKind {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "csv") return "csv";
  return "txt";
}

function loadXlsx(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "buffer" });
  const candidates = workbook.SheetNames
    .map((name) => {
      const sheet = workbook.Sheets[name];
      if (!sheet) return null;
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });
      return {
        name,
        rows: sanitizeRows(
          rawRows.map((r) => r.map((cell) => String(cell ?? "").trim())),
        ),
      };
    })
    .filter((c): c is { name: string; rows: string[][] } => c !== null && c.rows.length > 0);

  if (candidates.length === 0) {
    throw new Error("El archivo no contiene hojas con datos.");
  }
  // Mejor hoja: la que tenga modo bloque (packs APU) o la más poblada.
  const scored = candidates
    .map((candidate) => ({
      ...candidate,
      blockHits: countBlockSignals(candidate.rows),
    }))
    .sort((a, b) => {
      if ((b.blockHits >= 2 ? 1 : 0) !== (a.blockHits >= 2 ? 1 : 0)) {
        return b.blockHits >= 2 ? 1 : -1;
      }
      return b.rows.length - a.rows.length;
    });
  return scored[0]!.rows;
}

/** Cuenta señales de estructura APU (secciones/UNIDAD:) para elegir hoja. */
function countBlockSignals(rows: string[][]): number {
  let hits = 0;
  let scanned = 0;
  for (const row of rows) {
    for (const cell of row) {
      const n = normalizeText(cell);
      if (SECTION_MARKERS.includes(n) || /^unidad\s*:/i.test(String(cell ?? "").trim())) {
        hits += 1;
      }
    }
    scanned += 1;
    if (scanned > 500) break;
  }
  return hits;
}

export function parseFile(params: {
  buffer: ArrayBuffer;
  fileName: string;
}): ParsedTable {
  const kind = detectKind(params.fileName);
  let rawRows: string[][];

  if (kind === "xlsx") {
    rawRows = loadXlsx(params.buffer);
  } else {
    const text = new TextDecoder("utf-8").decode(params.buffer);
    const separator = detectDelimiter(text);
    rawRows = parseDelimited(text, separator);
    rawRows = sanitizeRows(rawRows);
    const separatorOut = separator;
    return {
      fileName: params.fileName,
      fileKind: kind,
      separator: separatorOut,
      rows: rawRows,
      blockMode: detectBlockMode(rawRows),
    };
  }

  return {
    fileName: params.fileName,
    fileKind: kind,
    rows: rawRows,
    blockMode: detectBlockMode(rawRows),
  };
}

/* ------------------------------------------------------------------ */
/* Detección de modo                                                   */
/* ------------------------------------------------------------------ */

/** Marcadores de sección YA NORMALIZADOS (comparar contra normalizeText). */
const SECTION_MARKERS = [
  "materiales",
  "equipo y herramientas",
  "equipo y herramienta",
  "mano de obra",
  "equipos",
  "transportes",
  "transporte",
  "otros",
  "subcontratos",
];

/** ¿El archivo tiene estructura de pack (secciones o "UNIDAD:" explícito)? */
export function detectBlockMode(rows: string[][]): boolean {
  let sectionHits = 0;
  let unidadColon = false;
  let scanned = 0;
  for (const row of rows) {
    for (const cell of row) {
      const n = normalizeText(String(cell ?? ""));
      if (SECTION_MARKERS.includes(n)) sectionHits += 1;
      if (/^unidad\s*:/i.test(String(cell ?? "").trim())) unidadColon = true;
    }
    scanned += 1;
    if (scanned > 2000) break;
  }
  return sectionHits >= 2 || (unidadColon && sectionHits >= 1);
}

/* ------------------------------------------------------------------ */
/* Partición en bloques APU (master packs)                             */
/* ------------------------------------------------------------------ */

export interface ApuBlock {
  code: string;
  name: string;
  unit: string;
  lines: ApuImportLine[];
  /** Encabezado de tabla de líneas detectado (null si el bloque no tiene tabla). */
  lineHeader: LineTableColumns | null;
  /** Índices de fila del archivo pertenecientes al bloque. */
  rowIndexes: number[];
}

export interface LineTableColumns {
  name: number;
  unit: number;
  quantity: number;
  price: number;
  section: number;
}

/** Detecta la fila de encabezado de la tabla de líneas dentro de un bloque. */
export function detectLineHeaderRow(row: string[]): LineTableColumns | null {
  const indexOf = (syns: string[]): number => {
    let hit = -1;
    let bestScore = 0;
    row.forEach((cell, i) => {
      const n = normalizeText(cell);
      for (const syn of syns) {
        const ns = normalizeText(syn);
        if (n === ns || (n.startsWith(ns) && n.length - ns.length <= 4)) {
          if (ns.length > bestScore) {
            bestScore = ns.length;
            hit = i;
          }
        }
      }
    });
    return hit;
  };

  const name = indexOf(["descripcion", "descripci", "detalle", "concepto"]);
  const unit = indexOf(["unidad", "unid", "und"]);
  const quantity = indexOf(["cant/rend", "cant", "cantidad", "rend", "n"]);
  const price = indexOf(["precio unitario", "valor unitario", "precio", "vr unitario", "valor", "vr"]);
  const section = indexOf(["tipo de insumo", "seccion", "sección"]);

  if (name < 0 || price < 0) return null;
  return { name, unit, quantity, price, section };
}

/**
 * Separa un código de actividad del título del pack ("1.01  Acarreo..." →
 * code "1.01", name "Acarreo..."). Sin prefijo → code "" y name completo.
 */
function splitTitle(title: string): { code: string; name: string } {
  const trimmed = title.trim();
  const match = /^(\d+(?:\.\d+)*)\s+(.+)$/.exec(trimmed) ?? null;
  if (match) return { code: match[1] as string, name: (match[2] as string).trim() };
  return { code: "", name: trimmed };
}

/** ¿El archivo tiene alguna sección MATERIALES:/EQUIPO:/MANO DE OBRA:? (escaneo corto) */
function hasSectionMarker(rows: string[][]): boolean {
  let scanned = 0;
  for (const row of rows) {
    if (!row) continue;
    for (const cell of row) {
      if (SECTION_MARKERS.includes(normalizeText(String(cell ?? "").trim()))) return true;
    }
    scanned += 1;
    if (scanned > 1000) break;
  }
  return false;
}

/** Separa una matriz en bloques iniciados por celdas "UNIDAD: xxx". */
export function splitBlocks(rows: string[][]): ApuBlock[] {
  const blocks: ApuBlock[] = [];
  let current: ApuBlock | null = null;
  let lineHeader: LineTableColumns | null = null;
  let currentSection: ApuImportLine["category"];
  const hasSection = hasSectionMarker(rows);

  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row) continue;

    // Inicio de bloque: celda "UNIDAD: m3" + título al lado.
    const rowCellCount = row.filter((c) => String(c ?? "").trim() !== "").length;
    const unitCellIndex = row.findIndex((cell) => {
      const rawCell = String(cell ?? "").trim();
      if (/^unidad\s*:/i.test(rawCell)) return true;
      if (!hasSection || rowCellCount > 3) return false;
      const n = normalizeText(rawCell);
      return n === "unidad" || /^unidad\s/.test(n);
    });
    if (unitCellIndex >= 0) {
      if (current && current.lines.length > 0) blocks.push(current);
      if (current && current.lines.length === 0) {
        // Bloque sin líneas: se conserva solo si tiene nombre (actividad vacía).
        if (current.name) blocks.push(current);
      }
      const unitRaw = row[unitCellIndex] as string;
      const unitValue = unitRaw.replace(/^\s*unidad\s*:\s*/i, "").trim();
      const titleCell = row.findIndex((cell, i) => i !== unitCellIndex && cell.trim() !== "");
      const title = titleCell >= 0 ? (row[titleCell] as string).trim() : "";
      const split = splitTitle(title);
      current = {
        code: split.code,
        name: split.name,
        unit: unitValue,
        lines: [],
        lineHeader: null,
        rowIndexes: [r],
      };
      lineHeader = null;
      currentSection = undefined;
      continue;
    }

    if (!current) continue;

    // Celda de sección (MATERIALES:/EQUIPO:/MANO DE OBRA:).
    const sectionCell = row.findIndex((cell) =>
      SECTION_MARKERS.includes(normalizeText(String(cell ?? "").trim())),
    );
    if (sectionCell >= 0) {
      const n = normalizeText((row[sectionCell] as string).trim());
      if (n.startsWith("mano de obra")) currentSection = "MANO_DE_OBRA";
      else if (n.startsWith("equipo") || n.startsWith("herramientas")) currentSection = "EQUIPO";
      else if (n.startsWith("transporte")) currentSection = "TRANSPORTE";
      else if (n.startsWith("material")) currentSection = "MATERIAL";
      // "otros"/"subcontratos"/etc: mantener la sección (la categoría real
      // se infiere luego por el nombre de la línea).
      continue;
    }

    // Encabezado de tabla de líneas (después de la sección).
    if (!lineHeader) {
      const detected = detectLineHeaderRow(row);
      if (detected) {
        lineHeader = detected;
        current.lineHeader = detected;
        continue;
      }
      // Fila previa al encabezado que no es sección (p. ej. leyenda) → se ignora.
      continue;
    }

    // Suma parcial o costo directo → no es línea.
    const joined = row.join(" ").toLowerCase();
    if (/subtotal|vr costo directo|valor costo directo|total /.test(joined)) continue;

    const nameCol = row[lineHeader.name]?.trim() ?? "";
    if (nameCol === "") continue;

    const priceText = (row[lineHeader.price] ?? "").trim();
    const unitText = lineHeader.unit >= 0 ? (row[lineHeader.unit] ?? "").trim() : "";
    const quantityText = lineHeader.quantity >= 0 ? (row[lineHeader.quantity] ?? "").trim() : "";

    current.lines.push({
      name: nameCol,
      unit: unitText,
      quantity: quantityText,
      price: priceText,
      category: currentSection,
    });
    current.rowIndexes.push(r);
  }

  if (current) {
    if (current.lines.length > 0 || current.name) blocks.push(current);
  }
  return blocks;
}