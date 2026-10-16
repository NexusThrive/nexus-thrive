/**
 * Lectura de un libro APU completo (formato "MASTER PACK"): hojas
 * ACTIVIDADES, APU, APU AUXILIARES, MATERIALES y CAPITULOS, más las fotos
 * incrustadas de los insumos.
 *
 * Principio: no se pierde ni se reinterpreta ningún dato. Cada línea de APU
 * se conserva tal como viene (sección, descripción, unidad, cantidad, precio
 * y parcial) y las fotos se extraen como bytes, asignadas a su fila por la
 * posición real del dibujo (ancla + desplazamiento + alto de filas).
 *
 * Puro respecto a la base de datos (SERVER ONLY por `node:crypto`).
 */
import { createHash } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import * as XLSX from "xlsx";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type MasterPackLine = {
  /** Posición dentro del APU (0, 1, 2…), en el orden del archivo. */
  order: number;
  /** Sección tal como viene ("MANO de OBRA:"), o null si la línea no tiene. */
  section: string | null;
  description: string;
  unit: string;
  /** "CANT/ REND" del archivo, como decimal en texto. */
  quantity: string;
  /** "PRECIO UNITARIO" del archivo. En líneas porcentuales es la base. */
  unitPrice: string;
  /** "VR PARCIAL" del archivo. */
  partial: string;
};

export type MasterPackApu = {
  /** Código de la actividad ("1.01"); null en APU auxiliares. */
  code: string | null;
  name: string;
  unit: string;
  /** "VR COSTO DIRECTO" (APU) o "VR UNITARIO" (auxiliar) del archivo. */
  totalCost: string | null;
  /** Otros totales con etiqueta del bloque (ej. "TOTAL % P" de prestaciones). */
  extraTotals: { label: string; value: string }[];
  lines: MasterPackLine[];
};

export type MasterPackChapter = {
  /** "22" o "22.63" (subcapítulo). */
  code: string;
  /** Capítulo padre de un subcapítulo ("22" para "22.63"). */
  parentCode: string | null;
  name: string;
  /** Posición en el archivo. */
  order: number;
};

export type MasterPackActivityRow = {
  code: string;
  chapterCode: string;
  description: string;
  unit: string;
  /** "VR UNITARIO" de la hoja ACTIVIDADES. */
  unitPrice: string | null;
};

export type MasterPackImage = {
  sha256: string;
  mimeType: string;
  data: Uint8Array;
};

export type MasterPackMaterial = {
  /** Fila del archivo (1-based) para trazabilidad. */
  row: number;
  description: string;
  unit: string;
  unitPrice: string;
  /** sha256 de la foto asignada a esta fila, si tiene. */
  imageSha256: string | null;
};

export type MasterPackParse = {
  chapters: MasterPackChapter[];
  activityRows: MasterPackActivityRow[];
  apus: MasterPackApu[];
  auxiliaries: MasterPackApu[];
  materials: MasterPackMaterial[];
  /** Fotos únicas por contenido. */
  images: Map<string, MasterPackImage>;
  /** Fotos ancladas fuera de una fila de insumo (logos, encabezados). */
  unassignedImages: number;
  warnings: string[];
};

/* ------------------------------------------------------------------ */
/* Detección                                                           */
/* ------------------------------------------------------------------ */

const SHEETS = {
  activities: "ACTIVIDADES",
  apu: "APU",
  auxiliaries: "APU AUXILIARES",
  materials: "MATERIALES",
  chapters: "CAPITULOS",
} as const;

function sheetKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

/** Un libro es un pack completo si trae al menos APU, MATERIALES y ACTIVIDADES. */
export function isMasterPackWorkbook(sheetNames: string[]): boolean {
  const keys = new Set(sheetNames.map(sheetKey));
  return keys.has(SHEETS.apu) && keys.has(SHEETS.materials) && keys.has(SHEETS.activities);
}

/* ------------------------------------------------------------------ */
/* Celdas                                                              */
/* ------------------------------------------------------------------ */

type Cell = string | number | boolean | null | undefined;
type Row = Cell[];

function text(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  return String(cell).trim();
}

function isBlank(cell: Cell): boolean {
  return text(cell) === "";
}

/**
 * Decimal en texto plano (sin notación científica) de un número del archivo:
 * `String(1e-7)` da "1e-7", que el resto del sistema no acepta.
 */
export function plainDecimal(value: number): string {
  const raw = String(value);
  const match = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/i.exec(raw);
  if (!match) return raw;
  const [, sign, intPart, fracPart = "", expRaw] = match;
  const exp = Number(expRaw);
  const digits = intPart + fracPart;
  const point = intPart.length + exp;
  let out: string;
  if (point <= 0) out = "0." + "0".repeat(-point) + digits;
  else if (point >= digits.length) out = digits + "0".repeat(point - digits.length);
  else out = digits.slice(0, point) + "." + digits.slice(point);
  out = out.replace(/^0+(?=\d)/, "");
  if (out.includes(".")) out = out.replace(/\.?0+$/, "");
  return sign + out;
}

/** Número del archivo como decimal en texto, sin pasar por formato regional. */
function decimal(cell: Cell): string | null {
  if (typeof cell === "number" && Number.isFinite(cell)) {
    return plainDecimal(cell);
  }
  const raw = text(cell);
  if (raw === "") return null;
  const normalized = raw.replace(/\s/g, "");
  return /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(normalized) ? plainDecimal(Number(normalized)) : null;
}

function sheetRows(workbook: XLSX.WorkBook, name: string): Row[] | null {
  const actual = workbook.SheetNames.find((sheet) => sheetKey(sheet) === name);
  if (!actual) return null;
  const sheet = workbook.Sheets[actual];
  if (!sheet) return null;
  return XLSX.utils.sheet_to_json<Row>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });
}

/* ------------------------------------------------------------------ */
/* Bloques APU                                                         */
/* ------------------------------------------------------------------ */

const CODE_PATTERN = /^\d+(\.\d+)+$/;

function splitTitle(title: string): { code: string | null; name: string } {
  const match = /^(\S+)\s+(.+)$/.exec(title.trim());
  if (match && CODE_PATTERN.test(match[1])) {
    return { code: match[1], name: match[2].trim() };
  }
  return { code: null, name: title.trim() };
}

function parseApuBlocks(rows: Row[], warnings: string[], sheetName: string): MasterPackApu[] {
  const blocks: MasterPackApu[] = [];
  let current: MasterPackApu | null = null;
  let section: string | null = null;

  rows.forEach((row, index) => {
    const [a, b, c, d, e] = [row[0], row[1], row[2], row[3], row[4]];
    const unitCell = text(e);
    if (unitCell.toUpperCase().startsWith("UNIDAD")) {
      const { code, name } = splitTitle(text(a));
      current = {
        code,
        name,
        unit: unitCell.split(":").slice(1).join(":").trim(),
        totalCost: null,
        extraTotals: [],
        lines: [],
      };
      blocks.push(current);
      section = null;
      return;
    }
    if (!current) return;
    const block: MasterPackApu = current;

    const label = text(d);
    if (isBlank(a) && label.endsWith("=")) {
      if (/^VR\s+(COSTO\s+DIRECTO|UNITARIO)\s*=/i.test(label)) {
        block.totalCost = decimal(e);
      } else if (!/^Subtotal\s*=/i.test(label)) {
        // Totales informativos del bloque: se guardan tal cual.
        const value = decimal(e);
        if (value !== null) {
          block.extraTotals.push({ label: label.replace(/\s*=\s*$/, ""), value });
        }
      }
      return;
    }

    const first = text(a);
    if (first === "" && isBlank(b) && isBlank(c) && isBlank(e)) return;
    if (first.toUpperCase() === "DESCRIPCIÓN" || first.toUpperCase() === "DESCRIPCION") return;
    if (first.endsWith(":") && isBlank(b) && isBlank(c)) {
      section = first;
      return;
    }

    const quantity = decimal(c);
    const unitPrice = decimal(d);
    const partial = decimal(e);
    if (first === "" || quantity === null || unitPrice === null || partial === null) {
      warnings.push(
        `${sheetName} fila ${index + 1}: línea sin valores numéricos completos ("${first}"), no se importó.`,
      );
      return;
    }
    block.lines.push({
      order: block.lines.length,
      section,
      description: first,
      unit: text(b),
      quantity,
      unitPrice,
      partial,
    });
  });
  return blocks;
}

/* ------------------------------------------------------------------ */
/* Hojas planas                                                        */
/* ------------------------------------------------------------------ */

function findHeader(rows: Row[], predicate: (row: Row) => boolean): number {
  return rows.findIndex(predicate);
}

function parseActivities(rows: Row[]): {
  chapters: MasterPackChapter[];
  activityRows: MasterPackActivityRow[];
} {
  const header = findHeader(rows, (row) => text(row[0]).toUpperCase() === "ITEM");
  const chapters: MasterPackChapter[] = [];
  const activityRows: MasterPackActivityRow[] = [];
  let chapterCode = "";
  for (const row of rows.slice(header + 1)) {
    const code = text(row[0]);
    if (code === "") continue;
    // Encabezado de capítulo ("22") o subcapítulo ("22.63"): fila sin unidad.
    if (/^\d+(\.\d+)*$/.test(code) && isBlank(row[2])) {
      chapterCode = code;
      const parentCode = code.includes(".") ? code.split(".").slice(0, -1).join(".") : null;
      chapters.push({ code, parentCode, name: text(row[1]), order: chapters.length });
      continue;
    }
    if (!CODE_PATTERN.test(code)) continue;
    activityRows.push({
      code,
      chapterCode: chapterCode || code.split(".")[0],
      description: text(row[1]),
      unit: text(row[2]),
      unitPrice: decimal(row[4]),
    });
  }
  return { chapters, activityRows };
}

function parseChaptersSheet(rows: Row[]): MasterPackChapter[] {
  const header = findHeader(rows, (row) => text(row[0]).toUpperCase() === "CODIGO");
  return rows
    .slice(header + 1)
    .filter((row) => /^\d+$/.test(text(row[0])))
    .map((row, index) => ({
      code: text(row[0]),
      parentCode: null,
      name: text(row[1]),
      order: index,
    }));
}

/* ------------------------------------------------------------------ */
/* Fotos incrustadas                                                   */
/* ------------------------------------------------------------------ */

const EMU_PER_POINT = 12_700;

function attr(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return match ? match[1] : null;
}

function relsMap(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(match[0], "Id");
    const target = attr(match[0], "Target");
    if (id && target) map.set(id, target);
  }
  return map;
}

/** Resuelve "../drawings/drawing4.xml" relativo a "xl/worksheets/". */
function resolvePath(baseDir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = baseDir.split("/").filter(Boolean);
  for (const piece of target.split("/")) {
    if (piece === "..") parts.pop();
    else if (piece !== ".") parts.push(piece);
  }
  return parts.join("/");
}

function mimeFor(path: string): string {
  const ext = path.toLowerCase().split(".").pop() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}

/**
 * Fotos de una hoja asignadas a su fila (0-based). La fila es la que contiene
 * el centro vertical de la imagen: un ancla con desplazamiento mayor que el
 * alto de su fila pertenece a una fila siguiente.
 */
function imagesBySheetRow(
  files: Record<string, Uint8Array>,
  sheetName: string,
  images: Map<string, MasterPackImage>,
): Map<number, string> {
  const result = new Map<number, string>();
  const workbookXml = files["xl/workbook.xml"];
  const workbookRels = files["xl/_rels/workbook.xml.rels"];
  if (!workbookXml || !workbookRels) return result;

  let sheetRid: string | null = null;
  for (const match of strFromU8(workbookXml).matchAll(/<sheet\b[^>]*>/g)) {
    const name = attr(match[0], "name");
    if (name && sheetKey(name) === sheetName) {
      sheetRid = attr(match[0], "r:id");
      break;
    }
  }
  if (!sheetRid) return result;
  const sheetTarget = relsMap(strFromU8(workbookRels)).get(sheetRid);
  if (!sheetTarget) return result;
  const sheetPath = resolvePath("xl", sheetTarget);
  const sheetXml = files[sheetPath] ? strFromU8(files[sheetPath]) : "";
  const sheetDir = sheetPath.split("/").slice(0, -1).join("/");
  const sheetRelsPath = `${sheetDir}/_rels/${sheetPath.split("/").pop()}.rels`;
  if (!files[sheetRelsPath]) return result;

  const defaultHeight = Number(
    /<sheetFormatPr\b[^>]*defaultRowHeight="([\d.]+)"/.exec(sheetXml)?.[1] ?? "15",
  );
  const heights = new Map<number, number>();
  for (const match of sheetXml.matchAll(/<row\b[^>]*>/g)) {
    const r = Number(attr(match[0], "r"));
    const ht = attr(match[0], "ht");
    if (r && ht) heights.set(r - 1, Number(ht));
  }
  const rowHeightEmu = (row: number) => (heights.get(row) ?? defaultHeight) * EMU_PER_POINT;

  for (const drawingTarget of relsMap(strFromU8(files[sheetRelsPath])).values()) {
    if (!drawingTarget.includes("drawing")) continue;
    const drawingPath = resolvePath(sheetDir, drawingTarget);
    const drawingXml = files[drawingPath] ? strFromU8(files[drawingPath]) : "";
    const drawingDir = drawingPath.split("/").slice(0, -1).join("/");
    const drawingRelsPath = `${drawingDir}/_rels/${drawingPath.split("/").pop()}.rels`;
    const mediaRels = files[drawingRelsPath] ? relsMap(strFromU8(files[drawingRelsPath])) : new Map();

    const anchors = drawingXml.matchAll(
      /<xdr:(oneCellAnchor|twoCellAnchor)\b[\s\S]*?<\/xdr:\1>/g,
    );
    for (const anchor of anchors) {
      const body = anchor[0];
      const from = /<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<xdr:rowOff>(\d+)<\/xdr:rowOff>/.exec(body);
      const embed = /r:embed="([^"]+)"/.exec(body)?.[1];
      if (!from || !embed) continue;
      const mediaTarget = mediaRels.get(embed);
      if (!mediaTarget) continue;
      const mediaPath = resolvePath(drawingDir, mediaTarget);
      const bytes = files[mediaPath];
      if (!bytes) continue;

      let heightEmu = Number(/<xdr:ext\b[^>]*cy="(\d+)"/.exec(body)?.[1] ?? "0");
      if (anchor[1] === "twoCellAnchor") {
        const to = /<xdr:to>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<xdr:rowOff>(\d+)<\/xdr:rowOff>/.exec(body);
        if (to) {
          heightEmu = 0;
          for (let r = Number(from[1]); r < Number(to[1]); r += 1) heightEmu += rowHeightEmu(r);
          heightEmu += Number(to[2]) - Number(from[2]);
        }
      }
      let row = Number(from[1]);
      let center = Number(from[2]) + heightEmu / 2;
      while (center > rowHeightEmu(row)) {
        center -= rowHeightEmu(row);
        row += 1;
      }

      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (!images.has(sha256)) {
        images.set(sha256, { sha256, mimeType: mimeFor(mediaPath), data: bytes });
      }
      if (!result.has(row)) result.set(row, sha256);
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Entrada                                                             */
/* ------------------------------------------------------------------ */

export function parseMasterPack(buffer: ArrayBuffer): MasterPackParse {
  const bytes = new Uint8Array(buffer);
  const workbook = XLSX.read(bytes, { type: "array", cellDates: false });
  if (!isMasterPackWorkbook(workbook.SheetNames)) {
    throw new Error("El libro no tiene las hojas APU, MATERIALES y ACTIVIDADES.");
  }
  const warnings: string[] = [];

  const activitySheet = sheetRows(workbook, SHEETS.activities) ?? [];
  const { chapters: activityChapters, activityRows } = parseActivities(activitySheet);
  const chapterSheet = sheetRows(workbook, SHEETS.chapters);
  const chapterList = chapterSheet ? parseChaptersSheet(chapterSheet) : [];
  const chapters = activityChapters.length ? activityChapters : chapterList;

  const apus = parseApuBlocks(sheetRows(workbook, SHEETS.apu) ?? [], warnings, SHEETS.apu);
  const auxiliaries = parseApuBlocks(
    sheetRows(workbook, SHEETS.auxiliaries) ?? [],
    warnings,
    SHEETS.auxiliaries,
  );

  const images = new Map<string, MasterPackImage>();
  let files: Record<string, Uint8Array> = {};
  try {
    files = unzipSync(bytes, {
      filter: (file) =>
        file.name.startsWith("xl/") &&
        (file.name.endsWith(".xml") || file.name.endsWith(".rels") || file.name.startsWith("xl/media/")),
    });
  } catch {
    warnings.push("No se pudieron leer las fotos del archivo; se importan los datos sin imágenes.");
  }
  const photoRows = imagesBySheetRow(files, SHEETS.materials, images);

  const materialRows = sheetRows(workbook, SHEETS.materials) ?? [];
  const materialHeader = findHeader(
    materialRows,
    (row) => text(row[1]).toUpperCase().startsWith("DESCRIPCI"),
  );
  const materials: MasterPackMaterial[] = [];
  const assignedRows = new Set<number>();
  materialRows.forEach((row, index) => {
    if (index <= materialHeader) return;
    const description = text(row[1]);
    if (description === "") return;
    const unitPrice = decimal(row[3]);
    if (unitPrice === null) {
      warnings.push(`MATERIALES fila ${index + 1}: "${description}" sin precio, no se importó.`);
      return;
    }
    const imageSha256 = photoRows.get(index) ?? null;
    if (imageSha256) assignedRows.add(index);
    materials.push({
      row: index + 1,
      description,
      unit: text(row[2]),
      unitPrice,
      imageSha256,
    });
  });
  const unassignedImages = [...photoRows.keys()].filter((row) => !assignedRows.has(row)).length;

  // Coherencia entre hojas: cada actividad debe tener su APU.
  const apuCodes = new Set(apus.map((apu) => apu.code).filter(Boolean));
  for (const row of activityRows) {
    if (!apuCodes.has(row.code)) {
      warnings.push(`ACTIVIDADES ${row.code}: no tiene análisis en la hoja APU.`);
    }
  }

  return {
    chapters,
    activityRows,
    apus,
    auxiliaries,
    materials,
    images,
    unassignedImages,
    warnings,
  };
}
