import * as XLSX from "xlsx";

/**
 * Lectura y escritura de tablas planas (CSV o Excel) para importar y exportar.
 * Pura: no toca la base. Los límites protegen al servidor de archivos enormes.
 */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;

export type Table = { headers: string[]; rows: string[][] };
export type TableResult = { ok: true; table: Table } | { ok: false; message: string };

/** Minúsculas sin tildes ni signos: «Teléfono (móvil)» → «telefono movil». */
export function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/** UTF-8 (con o sin BOM); si no lo es, el CSV viene de Excel en Windows-1252. */
function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/** Lee la primera hoja de un CSV o Excel. Las filas completamente vacías se descartan. */
export function readTable(buffer: ArrayBuffer, fileName: string): TableResult {
  if (buffer.byteLength === 0) return { ok: false, message: "El archivo está vacío." };
  if (buffer.byteLength > MAX_IMPORT_BYTES) return { ok: false, message: "El archivo pesa más de 5 MB. Divídelo en partes." };
  if (!/\.(csv|xlsx|xls|txt)$/i.test(fileName)) return { ok: false, message: "Sube un archivo CSV o Excel (.xlsx)." };
  let matrix: unknown[][];
  try {
    const workbook = /\.(csv|txt)$/i.test(fileName)
      ? XLSX.read(decodeText(buffer), { type: "string", cellDates: true, raw: false })
      : XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true, raw: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    if (!sheet) return { ok: false, message: "El archivo no tiene hojas con datos." };
    matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "", raw: false });
  } catch {
    return { ok: false, message: "No se pudo leer el archivo. Verifica que sea un CSV o Excel válido." };
  }
  const [head, ...body] = matrix;
  if (!head || head.every((h) => cellText(h) === "")) return { ok: false, message: "La primera fila debe tener los nombres de las columnas." };
  const headers = head.map(cellText);
  const rows = body.map((r) => headers.map((_, i) => cellText(r[i]))).filter((r) => r.some((c) => c !== ""));
  if (rows.length === 0) return { ok: false, message: "El archivo solo tiene los encabezados: no hay filas para importar." };
  if (rows.length > MAX_IMPORT_ROWS) return { ok: false, message: `El archivo tiene ${rows.length} filas; el máximo por carga es ${MAX_IMPORT_ROWS}. Divídelo en partes.` };
  return { ok: true, table: { headers, rows } };
}

/** Busca cada columna por sus nombres posibles; -1 si el archivo no la trae. */
export function mapColumns<K extends string>(headers: string[], aliases: Record<K, readonly string[]>): Record<K, number> {
  const normalized = headers.map(normalizeHeader);
  const out = {} as Record<K, number>;
  for (const key of Object.keys(aliases) as K[]) {
    out[key] = normalized.findIndex((h) => aliases[key].includes(h));
  }
  return out;
}

/**
 * Un número escrito a la colombiana o a la inglesa: «1.500,50», «1,500.50»,
 * «$ 2.000», «1500.5». Con un solo separador seguido de exactamente 3 dígitos
 * («1.500») se entiende miles. Devuelve null si no es un número.
 */
export function parseNumber(raw: string): number | null {
  let s = raw.replace(/[\s$]/g, "");
  if (!/^-?\d[\d.,]*$/.test(s)) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? "." : ",";
    s = s.split(decimal === "." ? "," : ".").join("").replace(decimal, ".");
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const parts = s.split(sep);
    const thousands = parts.length > 2 || (/^-?[1-9]\d{0,2}$/.test(parts[0] ?? "") && (parts[1] ?? "").length === 3);
    s = thousands ? parts.join("") : s.replace(sep, ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const YES = new Set(["si", "s", "yes", "y", "true", "1", "x", "activo"]);
const NO = new Set(["no", "n", "false", "0", "inactivo"]);
/** «Sí / No» en español o inglés. null = vacío o no se entiende. */
export function parseBool(raw: string): boolean | null {
  const v = normalizeHeader(raw);
  if (YES.has(v)) return true;
  if (NO.has(v)) return false;
  return null;
}

/** Una celda que empieza con = + @ (o - seguido de letra) se abre como fórmula en Excel: se neutraliza. */
export function safeCell(value: string): string {
  return /^[=+@]/.test(value) || /^-(?!\d)/.test(value) ? `'${value}` : value;
}

/** CSV con BOM (Excel lee las tildes), comillas dobles y saltos CRLF. */
export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const quote = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [headers, ...rows].map((r) => r.map((c) => quote(safeCell(c))).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
