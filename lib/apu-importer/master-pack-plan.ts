/**
 * Plan de importación de un pack APU completo (función pura).
 *
 * Convierte lo leído por `parseMasterPack` en insumos, capítulos, actividades
 * y líneas de composición listos para escribir, sin consultar la base:
 *
 * - Un insumo se identifica por descripción + unidad (`sourceKey`): el archivo
 *   no trae códigos de insumo. La sección pertenece a la LÍNEA, no al insumo
 *   (el mismo insumo puede estar en MATERIALES y en EQUIPO).
 * - Cada línea conserva lo que dice el archivo (sección, unidad, cantidad,
 *   precio, parcial y orden). Las líneas porcentuales ("%MO", "%", "%S")
 *   aplican la cantidad como porcentaje sobre su precio base:
 *   consumo = cantidad / 100.
 * - Se verifica que el costo calculado de cada APU coincida con el
 *   "VR COSTO DIRECTO" del archivo.
 */
import type { ApuItemCategoryValue } from "@/lib/apu-engine";
import type { MasterPackApu, MasterPackParse } from "./master-pack";

export type PlannedPackItem = {
  sourceKey: string;
  name: string;
  unit: string;
  category: ApuItemCategoryValue;
  /** Precio del insumo: el de MATERIALES si está, si no el de su primera línea. */
  unitPrice: string;
  imageSha256: string | null;
  /** Línea porcentual: su precio es una base que cambia en cada APU. */
  isPercent: boolean;
  /** Clave del APU auxiliar que define este insumo (APU compuesto). */
  auxiliarySourceKey: string | null;
};

export type PlannedPackLine = {
  order: number;
  section: string | null;
  itemSourceKey: string;
  lineUnit: string;
  lineQuantity: string;
  lineUnitPrice: string;
  linePartial: string;
  /** Consumo efectivo: la cantidad, o cantidad / 100 en líneas porcentuales. */
  consumption: string;
};

export type PlannedPackActivity = {
  sourceKey: string;
  code: string | null;
  name: string;
  unit: string;
  chapterCode: string | null;
  sortKey: string | null;
  isAuxiliary: boolean;
  referenceUnitPrice: string | null;
  extras: { label: string; value: string }[];
  lines: PlannedPackLine[];
  /** Costo calculado por el sistema (pesos, 2 decimales). */
  computedUnitCost: string;
};

export type PackMismatch = {
  sourceKey: string;
  name: string;
  reference: string;
  computed: string;
};

export type MasterPackPlan = {
  chapters: MasterPackParse["chapters"];
  items: PlannedPackItem[];
  activities: PlannedPackActivity[];
  /** APU cuyo costo calculado no coincide con el del archivo. */
  mismatches: PackMismatch[];
  /** Insumos cuyo precio en MATERIALES difiere del de alguna línea APU. */
  priceConflicts: number;
  lineCount: number;
};

/* ------------------------------------------------------------------ */
/* Claves y categorías                                                 */
/* ------------------------------------------------------------------ */

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Identidad de un insumo: descripción + unidad, sin distinguir mayúsculas. */
export function itemSourceKey(description: string, unit: string): string {
  return `${collapse(description).toUpperCase()}|${collapse(unit).toUpperCase()}`;
}

export function activitySourceKey(apu: Pick<MasterPackApu, "code" | "name" | "unit">, auxiliary: boolean): string {
  return auxiliary
    ? `AUX:${itemSourceKey(apu.name, apu.unit)}`
    : `APU:${apu.code ?? itemSourceKey(apu.name, apu.unit)}`;
}

/** "22.63.01" → "0022.0063.0001": ordena como el archivo y no como texto. */
export function codeSortKey(code: string | null): string | null {
  if (!code) return null;
  return code
    .split(".")
    .map((part) => part.padStart(4, "0"))
    .join(".");
}

function plain(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

/** Categoría del catálogo para una sección del archivo. */
export function categoryForSection(section: string | null): ApuItemCategoryValue {
  const key = plain(section ?? "");
  if (key.startsWith("MATERIAL")) return "MATERIAL";
  if (key.startsWith("EQUIPO")) return "EQUIPO";
  if (key.startsWith("TRANSPORT")) return "TRANSPORTE";
  if (key.startsWith("SUBCONTRAT")) return "SUBCONTRATO";
  if (key.startsWith("OTRO")) return "OTRO";
  // Mano de obra y sus componentes (seguridad social, prestaciones,
  // parafiscales, dotación y EPP de los auxiliares de cuadrilla).
  if (
    key.startsWith("MANO") ||
    key.startsWith("SEGURIDAD") ||
    key.startsWith("PRESTACION") ||
    key.startsWith("APORTES") ||
    key.startsWith("ELEMENTOS DE PROTECCION") ||
    key.startsWith("VESTIDO") ||
    key.startsWith("ZAPATOS")
  ) {
    return "MANO_DE_OBRA";
  }
  return "OTRO";
}

export function isPercentUnit(unit: string): boolean {
  return unit.trim().startsWith("%");
}

/* ------------------------------------------------------------------ */
/* Aritmética decimal exacta (texto → BigInt escalado)                 */
/* ------------------------------------------------------------------ */

function scaled(value: string): { digits: bigint; scale: number } {
  const [intPart, frac = ""] = value.replace(/^-/, "").split(".");
  const sign = value.startsWith("-") ? BigInt(-1) : BigInt(1);
  return { digits: sign * BigInt((intPart || "0") + frac), scale: frac.length };
}

/** a / 100 exacto en texto ("10" → "0.1", "2.5" → "0.025"). */
export function percentToFraction(value: string): string {
  const { digits, scale } = scaled(value);
  const negative = digits < BigInt(0);
  const abs = (negative ? -digits : digits).toString().padStart(scale + 3, "0");
  const point = abs.length - (scale + 2);
  let out = `${abs.slice(0, point)}.${abs.slice(point)}`.replace(/^0+(?=\d)/, "");
  out = out.replace(/\.?0+$/, "");
  return (negative ? "-" : "") + (out === "" ? "0" : out);
}

/** a × b redondeado a centavos (half-up), en centavos. */
function productCents(a: string, b: string): bigint {
  const x = scaled(a);
  const y = scaled(b);
  const product = x.digits * y.digits;
  const scale = x.scale + y.scale;
  if (scale <= 2) return product * BigInt(10) ** BigInt(2 - scale);
  const divisor = BigInt(10) ** BigInt(scale - 2);
  const half = divisor / BigInt(2);
  return product >= BigInt(0) ? (product + half) / divisor : (product - half) / divisor;
}

function centsToString(cents: bigint): string {
  const negative = cents < BigInt(0);
  const abs = (negative ? -cents : cents).toString().padStart(3, "0");
  return `${negative ? "-" : ""}${abs.slice(0, -2)}.${abs.slice(-2)}`;
}

function toCents(value: string): bigint {
  return productCents(value, "1");
}

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

export function buildMasterPackPlan(parse: MasterPackParse): MasterPackPlan {
  const items = new Map<string, PlannedPackItem>();
  const sectionVotes = new Map<string, Map<ApuItemCategoryValue, number>>();
  let priceConflicts = 0;

  // 1. Insumos de MATERIALES (precio y foto de referencia).
  for (const material of parse.materials) {
    const key = itemSourceKey(material.description, material.unit);
    const existing = items.get(key);
    if (existing) {
      if (!existing.imageSha256 && material.imageSha256) existing.imageSha256 = material.imageSha256;
      continue;
    }
    items.set(key, {
      sourceKey: key,
      name: collapse(material.description),
      unit: collapse(material.unit),
      category: "MATERIAL",
      unitPrice: material.unitPrice,
      imageSha256: material.imageSha256,
      isPercent: false,
      auxiliarySourceKey: null,
    });
  }
  const fromMaterials = new Set(items.keys());

  // 2. Auxiliares: su clave de insumo enlaza el APU compuesto.
  const auxByItemKey = new Map<string, string>();
  for (const aux of parse.auxiliaries) {
    auxByItemKey.set(itemSourceKey(aux.name, aux.unit), activitySourceKey(aux, true));
  }

  const chapterByActivity = new Map(parse.activityRows.map((row) => [row.code, row.chapterCode]));
  const activities: PlannedPackActivity[] = [];
  const mismatches: PackMismatch[] = [];
  let lineCount = 0;

  const planBlock = (apu: MasterPackApu, auxiliary: boolean) => {
    const sourceKey = activitySourceKey(apu, auxiliary);
    let totalCents = BigInt(0);
    const lines: PlannedPackLine[] = apu.lines.map((line) => {
      const key = itemSourceKey(line.description, line.unit);
      const percent = isPercentUnit(line.unit);
      const consumption = percent ? percentToFraction(line.quantity) : line.quantity;
      totalCents += productCents(consumption, line.unitPrice);

      const category = categoryForSection(line.section);
      const votes = sectionVotes.get(key) ?? new Map<ApuItemCategoryValue, number>();
      votes.set(category, (votes.get(category) ?? 0) + 1);
      sectionVotes.set(key, votes);

      const item = items.get(key);
      if (!item) {
        items.set(key, {
          sourceKey: key,
          name: collapse(line.description),
          unit: collapse(line.unit),
          category,
          unitPrice: percent ? "0" : line.unitPrice,
          imageSha256: null,
          isPercent: percent,
          auxiliarySourceKey: auxByItemKey.get(key) ?? null,
        });
      } else {
        if (!percent && fromMaterials.has(key) && toCents(item.unitPrice) !== toCents(line.unitPrice)) {
          priceConflicts += 1;
        }
        if (!item.auxiliarySourceKey && auxByItemKey.has(key)) {
          item.auxiliarySourceKey = auxByItemKey.get(key) ?? null;
        }
      }

      return {
        order: line.order,
        section: line.section,
        itemSourceKey: key,
        lineUnit: line.unit,
        lineQuantity: line.quantity,
        lineUnitPrice: line.unitPrice,
        linePartial: line.partial,
        consumption,
      };
    });
    lineCount += lines.length;

    const computed = centsToString(totalCents);
    if (apu.totalCost !== null) {
      // Tolerancia: medio centavo de redondeo por línea del archivo; si el
      // archivo declara el total redondeado al peso (auxiliares de mano de
      // obra), basta con que coincida al peso.
      const roundedToPeso = !apu.totalCost.includes(".");
      const tolerance = roundedToPeso
        ? BigInt(99)
        : BigInt(Math.max(1, Math.ceil(lines.length / 2)));
      const diff = totalCents - toCents(apu.totalCost);
      if (diff > tolerance || -diff > tolerance) {
        mismatches.push({ sourceKey, name: apu.name, reference: apu.totalCost, computed });
      }
    }

    activities.push({
      sourceKey,
      code: auxiliary ? null : apu.code,
      name: apu.name,
      unit: apu.unit,
      chapterCode: auxiliary || !apu.code ? null : (chapterByActivity.get(apu.code) ?? null),
      sortKey: auxiliary ? null : codeSortKey(apu.code),
      isAuxiliary: auxiliary,
      referenceUnitPrice: apu.totalCost,
      extras: apu.extraTotals,
      lines,
      computedUnitCost: computed,
    });
  };

  // Auxiliares primero: los APU principales los usan como insumo.
  for (const aux of parse.auxiliaries) planBlock(aux, true);
  for (const apu of parse.apus) planBlock(apu, false);

  // Categoría de los insumos que no están en MATERIALES: la sección más usada.
  for (const [key, item] of items) {
    if (fromMaterials.has(key)) continue;
    const votes = sectionVotes.get(key);
    if (!votes) continue;
    item.category = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  return {
    chapters: parse.chapters,
    items: [...items.values()],
    activities,
    mismatches,
    priceConflicts,
    lineCount,
  };
}
