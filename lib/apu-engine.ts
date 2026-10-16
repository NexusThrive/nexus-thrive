/**
 * Motor de cálculo APU y presupuestos de obra (NEXUS THRIVE).
 *
 * Precisión DECIMAL sin dependencias: el driver de Prisma 8 de este
 * proyecto materializa las columnas `Decimal` como STRINGS y acepta
 * strings al escribir. Por eso todo el cálculo financiero vive aquí, en
 * aritmética de punto fijo con `BigInt` (6 decimales: micro-unidades de
 * COP). Cero `number` en operaciones monetarias → cero error de punto
 * flotante, determinístico en todos los entornos.
 *
 * Este módulo es 100% servidor y NO importa la interfaz: es el único
 * lugar autorizado para costo de componentes, costo unitario de APU,
 * totales de presupuesto y validación numérica.
 */

/* ------------------------------------------------------------------ */
/* Punto fijo (micro-unidades)                                         */
/* ------------------------------------------------------------------ */

/** Escala interna: 1 unidad = 1_000_000 micro (6 decimales). */
const UNIT = BigInt(1_000_000);
const HALF = UNIT / BigInt(2); // para redondeo half-up (valores no negativos)

/** Dinero/cantidad en micro-unidades (nunca exponer fuera del motor). */
type Money = bigint;

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Convierte un string decimal a micro-unidades. Rechaza vacíos, NaN,
 * Infinity, notación científica y más de 6 decimales. Devuelve `null`
 * si el valor no es un decimal válido.
 */
export function parseMoney(raw: string): Money | null {
  const value = raw.trim();
  if (!value || value.length > 40 || !DECIMAL_PATTERN.test(value)) {
    return null;
  }
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [intPart, fracPart = ""] = unsigned.split(".");
  if (fracPart.length > 6) {
    return null;
  }
  const micro =
    BigInt(intPart || "0") * UNIT +
    BigInt((fracPart + "000000").slice(0, 6));
  return negative ? -micro : micro;
}

/**
 * Serializa micro-unidades a string decimal canónico (sin ceros sobrantes;
 * enteros sin punto). Es el formato que acepta el driver para `Decimal`.
 */
export function moneyToString(micro: Money): string {
  const sign = micro < BigInt(0) ? "-" : "";
  const abs = micro < BigInt(0) ? -micro : micro;
  const whole = abs / UNIT;
  const frac = abs % UNIT;
  if (frac === BigInt(0)) {
    return `${sign}${whole}`;
  }
  const fracText = frac.toString().padStart(6, "0").replace(/0+$/, "");
  return `${sign}${whole}.${fracText}`;
}

/**
 * Convierte un decimal (string) a micro-unidades aplicando redondeo half-up a
 * 6 decimales. A diferencia de `parseMoney` NO rechaza valores con más de 6
 * decimales: los redondea (necesario para importar catálogos con precisión
 * arbitraria). Rechaza negativos, vacíos, notación científica y cualquier
 * entrada que no sea un decimal no negativo.
 */
export function decimalToMicro(raw: string): Money | null {
  const value = raw.trim();
  if (!value || value.length > 60 || !DECIMAL_PATTERN.test(value)) {
    return null;
  }
  if (value.startsWith("-")) {
    return null;
  }
  const [intPart, fracPart = ""] = value.split(".");
  const base = BigInt(intPart || "0") * UNIT;
  if (fracPart.length <= 6) {
    return base + BigInt((fracPart + "000000").slice(0, 6));
  }
  const kept = BigInt(fracPart.slice(0, 6));
  const roundsUp = fracPart.charCodeAt(6) - 48 >= 5;
  return base + kept + (roundsUp ? BigInt(1) : BigInt(0));
}

/** División con redondeo half-up (valores no negativos). */
function roundDiv(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / BigInt(2)) / denominator;
}

/** Porcentaje de un monto: `amount * percent / 100` (micro-puntos). */
function percentOf(amount: Money, percentMicro: Money): Money {
  if (amount <= BigInt(0) || percentMicro <= BigInt(0)) {
    return BigInt(0);
  }
  return roundDiv(amount * percentMicro, BigInt(100) * UNIT);
}

/* ------------------------------------------------------------------ */
/* Validación numérica (server + import)                               */
/* ------------------------------------------------------------------ */

/** `true` si el string es un decimal válido (máx. 6 decimales). */
export function isValidDecimal(raw: string): boolean {
  return parseMoney(raw) !== null;
}

/** `true` si el string es un decimal > 0. */
export function isStrictlyPositive(raw: string): boolean {
  const value = parseMoney(raw);
  return value !== null && value > BigInt(0);
}

/** `true` si el string es un decimal >= 0. */
export function isNonNegative(raw: string): boolean {
  const value = parseMoney(raw);
  return value !== null && value >= BigInt(0);
}

/** `true` si el string es un porcentaje dentro de [0, maxPercent]. */
export function isValidPercent(raw: string, maxPercent: number): boolean {
  const value = parseMoney(raw);
  if (value === null || value < BigInt(0)) {
    return false;
  }
  const max = parseMoney(String(maxPercent));
  return max !== null && value <= max;
}

/**
 * Año vigente en America/Bogota (para códigos tipo PRES-2026-001).
 * Nunca usar `new Date().getFullYear()` (zona del servidor) aquí.
 */
export function currentYearBogota(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === "year")?.value ?? NaN);
}

/* ------------------------------------------------------------------ */
/* Catálogos del dominio (espejo de enums del contrato)                */
/* ------------------------------------------------------------------ */

export const APU_ITEM_CATEGORIES = [
  { value: "MATERIAL", label: "Material" },
  { value: "MANO_DE_OBRA", label: "Mano de Obra" },
  { value: "EQUIPO", label: "Equipo" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "OTRO", label: "Otros" },
  { value: "SUBCONTRATO", label: "Subcontrato" },
] as const;
export type ApuItemCategoryValue = (typeof APU_ITEM_CATEGORIES)[number]["value"];

export const QUOTE_STATUSES = [
  { value: "DRAFT", label: "Borrador" },
  { value: "SENT", label: "Enviado" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "REJECTED", label: "Rechazado" },
] as const;
export type QuoteStatusValue = (typeof QUOTE_STATUSES)[number]["value"];

/** Unidades admitidas en el banco de insumos y en las actividades. */
export const APU_UNITS = [
  "M3",
  "KG",
  "BULTO",
  "HR",
  "UND",
  "M2",
  "ML",
  "GLB",
  "L",
  "M",
  "CM",
  "PZA",
  "DIA",
  "MES",
  "GAL",
  "PAR",
  "JGO",
  "KM",
  "HA",
] as const;
export type ApuUnitValue = (typeof APU_UNITS)[number];

/**
 * Mapeo de PRESENTACIÓN de unidades: la base guarda el código técnico
 * (`M2`, `M3`) y la UI muestra el símbolo (`m²`, `m³`). No altera lo
 * almacenado — es solo capa de visualización.
 */
const APU_UNIT_LABELS: Record<string, string> = {
  M2: "m²",
  M3: "m³",
};

/** Devuelve la etiqueta visual de una unidad (cae al código si no hay mapeo). */
export function formatApuUnit(unit: string | null | undefined): string {
  if (!unit) {
    return "";
  }
  return APU_UNIT_LABELS[unit] ?? unit;
}

export function apuCategoryLabel(category: ApuItemCategoryValue): string {
  return (
    APU_ITEM_CATEGORIES.find((option) => option.value === category)?.label ??
    category
  );
}

export function quoteStatusLabel(status: QuoteStatusValue): string {
  return (
    QUOTE_STATUSES.find((option) => option.value === status)?.label ?? status
  );
}

export function isValidCategory(raw: string): raw is ApuItemCategoryValue {
  return (APU_ITEM_CATEGORIES as readonly { value: string }[]).some(
    (option) => option.value === raw,
  );
}

export function isValidStatus(raw: string): raw is QuoteStatusValue {
  return (QUOTE_STATUSES as readonly { value: string }[]).some(
    (option) => option.value === raw,
  );
}

export function isValidUnit(raw: string): raw is ApuUnitValue {
  return (APU_UNITS as readonly string[]).includes(raw);
}

/* ------------------------------------------------------------------ */
/* Costos APU                                                          */
/* ------------------------------------------------------------------ */

export type ActivityComponentInput = {
  unitPrice: string;
  consumption: string;
  wastePercent: string;
};

/**
 * Costo de UN componente de una actividad:
 *   precio × consumo × (1 + desperdicio/100)
 * Todo en micro-unidades enteras; se redondea half-up al micro.
 */
export function componentCost(input: ActivityComponentInput): Money {
  const unitPrice = parseMoney(input.unitPrice);
  const consumption = parseMoney(input.consumption);
  const waste = parseMoney(input.wastePercent);

  if (unitPrice === null || consumption === null || waste === null) {
    throw new Error("componentCost: entrada decimal inválida.");
  }
  if (unitPrice < BigInt(0) || consumption < BigInt(0) || waste < BigInt(0)) {
    throw new Error("componentCost: valores negativos no permitidos.");
  }

  // factor = (100 + desperdicio) / 100 en micro-puntos → 100*UNIT + waste
  const factor = BigInt(100) * UNIT + waste;
  return roundDiv(
    unitPrice * consumption * factor,
    BigInt(100) * UNIT * UNIT,
  );
}

/** Costo unitario de una actividad = Σ de sus componentes. */
export function activityUnitCost(components: ActivityComponentInput[]): string {
  let total = BigInt(0);
  for (const component of components) {
    total += componentCost(component);
  }
  return moneyToString(total);
}

/* ------------------------------------------------------------------ */
/* Presupuestos                                                        */
/* ------------------------------------------------------------------ */

export type AiuConfig = {
  adminPercent: string;
  imprevPercent: string;
  utilPercent: string;
  taxPercent: string;
};

export type QuoteLineInput = {
  quantity: string;
  unitCost: string;
};

/** Total por línea: cantidad × costo unitario (redondeado half-up). */
export function lineTotal(quantity: string, unitCost: string): Money {
  const qty = parseMoney(quantity);
  const cost = parseMoney(unitCost);
  if (qty === null || cost === null) {
    throw new Error("lineTotal: entrada decimal inválida.");
  }
  if (qty < BigInt(0) || cost < BigInt(0)) {
    throw new Error("lineTotal: valores negativos no permitidos.");
  }
  return roundDiv(qty * cost, UNIT);
}

export type QuoteTotals = {
  directCost: string;
  administration: string;
  contingency: string;
  utility: string;
  subtotal: string;
  tax: string;
  totalAmount: string;
};

/**
 * Totales de un presupuesto (AIU + IVA sobre utilidad). Recibe líneas con
 * cantidad/costo ya validados; el servidor SIEMPRE recalcula — nunca se
 * confía en totales enviados por el navegador.
 *
 *   directCost  = Σ(qty × unitCost)
 *   administr.  = directCost × adminPercent%
 *   contingency = directCost × imprevPercent%
 *   utility     = directCost × utilPercent%
 *   subtotal    = direct + admin + contingency + utility
 *   tax         = utility × taxPercent%   ← IVA SOLO sobre la utilidad
 *   total       = subtotal + tax
 */
export function calculateQuoteTotals(
  items: QuoteLineInput[],
  config: AiuConfig,
): QuoteTotals {
  const admin = parseMoney(config.adminPercent);
  const imprev = parseMoney(config.imprevPercent);
  const util = parseMoney(config.utilPercent);
  const tax = parseMoney(config.taxPercent);
  if (
    admin === null ||
    imprev === null ||
    util === null ||
    tax === null ||
    admin < BigInt(0) ||
    imprev < BigInt(0) ||
    util < BigInt(0) ||
    tax < BigInt(0)
  ) {
    throw new Error("calculateQuoteTotals: porcentajes AIU inválidos.");
  }

  let directCost = BigInt(0);
  for (const item of items) {
    directCost += lineTotal(item.quantity, item.unitCost);
  }

  const administration = percentOf(directCost, admin);
  const contingency = percentOf(directCost, imprev);
  const utility = percentOf(directCost, util);
  const subtotal = directCost + administration + contingency + utility;
  const taxAmount = percentOf(utility, tax);
  const totalAmount = subtotal + taxAmount;

  return {
    directCost: moneyToString(directCost),
    administration: moneyToString(administration),
    contingency: moneyToString(contingency),
    utility: moneyToString(utility),
    subtotal: moneyToString(subtotal),
    tax: moneyToString(taxAmount),
    totalAmount: moneyToString(totalAmount),
  };
}

/** Suma de totales de línea (para read-back de un presupuesto guardado). */
export function directCostOf(quantities: string[], unitCosts: string[]): string {
  let total = BigInt(0);
  for (let index = 0; index < quantities.length; index += 1) {
    total += lineTotal(quantities[index], unitCosts[index]);
  }
  return moneyToString(total);
}

/* ------------------------------------------------------------------ */
/* Presupuesto de proyecto — motor BigInt (FASE 2, Tab 2)              */
/* ------------------------------------------------------------------ */

/**
 * Escala de punto fijo (6 decimales), la que exige el contrato de
 * `ProjectBudget` (columnas `BigInt`).
 *   · DINERO/CANTIDAD: 1_000_000 = 1.000000
 *   · PORCENTAJES almacenados: 1_000_000 = 1.000000 = 100 %
 *     (100_000 = 10 %, 50_000 = 5 %, 190_000 = 19 %)
 */
export const SCALE = UNIT;

/**
 * Configuración AIU por defecto del vertical construcción: Admin 10 %,
 * Imprevistos 5 %, Utilidad 5 %, IVA sobre utilidad 19 %. Es la fuente única
 * en TypeScript — debe coincidir con los `@default` de `ProjectBudget` en
 * `prisma/contract.prisma` (100_000 / 50_000 / 50_000 / 190_000).
 */
export const AIU_DEFAULTS = {
  adminPct: BigInt(100_000),
  imprevPct: BigInt(50_000),
  utilidadPct: BigInt(50_000),
  ivaUtilidadPct: BigInt(190_000),
} as const;

/**
 * Convierte un porcentaje legible ("10", "9.5", "19") a la micro-fracción
 * almacenada (100_000 = 10 %). Devuelve `null` si no es un decimal válido.
 * Nota: es una división exacta por 100 sobre el decimal ya parseado.
 */
export function percentToMicro(raw: string): bigint | null {
  const value = parseMoney(raw);
  if (value === null) {
    return null;
  }
  return value / BigInt(100);
}

/** Inverso de `percentToMicro`: 100_000 → "10", 190_000 → "19". */
export function microToPercent(micro: bigint): string {
  return moneyToString(micro * BigInt(100));
}

/**
 * Costo directo total de una partida: `quantity × unitCostDirect`, ambos en
 * micro-unidades. Redondeo half-up al micro (misma regla del motor).
 * Rechaza valores negativos.
 */
export function calculateItemTotal(quantity: bigint, unitCost: bigint): bigint {
  if (quantity < BigInt(0) || unitCost < BigInt(0)) {
    throw new Error("calculateItemTotal: valores negativos no permitidos.");
  }
  return roundDiv(quantity * unitCost, SCALE);
}

/**
 * Costo de UNA línea de recurso del presupuesto, todo en micro-unidades:
 *   performance × (SCALE + wastePct) × unitPrice / SCALE²
 * `wastePct` es la fracción de desperdicio en micro (1_000_000 = 100 %).
 * Redondeo half-up, idéntico a `updateResource` e `importActivityFromCatalog`.
 * Rechaza valores negativos.
 */
export function resourceLineCostMicro(params: {
  performance: bigint;
  wastePct: bigint;
  unitPrice: bigint;
}): Money {
  const { performance, wastePct, unitPrice } = params;
  if (
    performance < BigInt(0) ||
    wastePct < BigInt(0) ||
    unitPrice < BigInt(0)
  ) {
    throw new Error("resourceLineCostMicro: valores negativos no permitidos.");
  }
  return roundDiv(
    performance * (SCALE + wastePct) * unitPrice,
    SCALE * SCALE,
  );
}

export type BudgetTotals = {
  adminTotal: bigint;
  imprevTotal: bigint;
  utilidadTotal: bigint;
  ivaUtilidadTotal: bigint;
  grandTotal: bigint;
};

/**
 * Cascada financiera del presupuesto: administración, imprevistos y utilidad
 * se aplican sobre el costo directo; el IVA SOLO sobre la utilidad.
 * Todos los operandos están en micro-unidades y los porcentajes con
 * 1_000_000 = 100 %. Aritmética `BigInt` pura, redondeo half-up, sin punto
 * flotante. Determinístico.
 */
export function calculateBudgetTotals(
  directCostTotal: bigint,
  adminPct: bigint,
  imprevPct: bigint,
  utilidadPct: bigint,
  ivaUtilidadPct: bigint,
): BudgetTotals {
  if (
    directCostTotal < BigInt(0) ||
    adminPct < BigInt(0) ||
    imprevPct < BigInt(0) ||
    utilidadPct < BigInt(0) ||
    ivaUtilidadPct < BigInt(0)
  ) {
    throw new Error("calculateBudgetTotals: valores negativos no permitidos.");
  }

  const adminTotal = roundDiv(directCostTotal * adminPct, SCALE);
  const imprevTotal = roundDiv(directCostTotal * imprevPct, SCALE);
  const utilidadTotal = roundDiv(directCostTotal * utilidadPct, SCALE);
  const ivaUtilidadTotal = roundDiv(utilidadTotal * ivaUtilidadPct, SCALE);
  const grandTotal =
    directCostTotal +
    adminTotal +
    imprevTotal +
    utilidadTotal +
    ivaUtilidadTotal;

  return { adminTotal, imprevTotal, utilidadTotal, ivaUtilidadTotal, grandTotal };
}

/** Catálogo de tipos de recurso de una partida (espejo del enum del contrato). */
export const RESOURCE_TYPES = [
  { value: "MATERIAL", label: "Material" },
  { value: "LABOR", label: "Mano de obra" },
  { value: "EQUIPMENT", label: "Equipo" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "OTHER", label: "Otros" },
  { value: "SUBCONTRACT", label: "Subcontrato" },
] as const;
export type ResourceTypeValue = (typeof RESOURCE_TYPES)[number]["value"];

export function resourceTypeLabel(type: ResourceTypeValue): string {
  return RESOURCE_TYPES.find((option) => option.value === type)?.label ?? type;
}

export function isValidResourceType(raw: string): raw is ResourceTypeValue {
  return (RESOURCE_TYPES as readonly { value: string }[]).some(
    (option) => option.value === raw,
  );
}

/**
 * Convierte una categoría de insumo APU al tipo de recurso del presupuesto.
 * Mapeo 1:1 determinista, sin efectos colaterales (función pura).
 */
export function apuItemCategoryToResourceType(
  category: ApuItemCategoryValue,
): ResourceTypeValue {
  const map: Record<ApuItemCategoryValue, ResourceTypeValue> = {
    MATERIAL: "MATERIAL",
    MANO_DE_OBRA: "LABOR",
    EQUIPO: "EQUIPMENT",
    TRANSPORTE: "TRANSPORT",
    OTRO: "OTHER",
    SUBCONTRATO: "SUBCONTRACT",
  };
  return map[category];
}

/* ------------------------------------------------------------------ */
/* Snapshot del APU (inmutable al cotizar)                             */
/* ------------------------------------------------------------------ */

export type ApuSnapshotComponent = {
  itemId: string;
  code: string | null;
  name: string;
  unit: string;
  category: ApuItemCategoryValue;
  unitPrice: string;
  consumption: string;
  wastePercent: string;
  calculatedCost: string;
};

export type ApuSnapshot = {
  activity: {
    id: string;
    code: string | null;
    name: string;
    unit: string;
  };
  unitCost: string;
  components: ApuSnapshotComponent[];
};

/**
 * Construye el snapshot de una actividad ya leída con sus composiciones
 * e insumos. Todo se serializa a strings: el snapshot guardado en `Json`
 * queda inmutable aunque el catálogo APU cambie después.
 */
export function buildApuSnapshot(input: {
  activity: {
    id: string;
    code: string | null;
    name: string;
    unit: string;
  };
  components: {
    itemId: string;
    code: string | null;
    name: string;
    unit: string;
    category: ApuItemCategoryValue;
    unitPrice: string;
    consumption: string;
    wastePercent: string;
  }[];
}): ApuSnapshot {
  return {
    activity: input.activity,
    unitCost: activityUnitCost(
      input.components.map((component) => ({
        unitPrice: component.unitPrice,
        consumption: component.consumption,
        wastePercent: component.wastePercent,
      })),
    ),
    components: input.components.map((component) => ({
      ...component,
      calculatedCost: moneyToString(
        componentCost({
          unitPrice: component.unitPrice,
          consumption: component.consumption,
          wastePercent: component.wastePercent,
        }),
      ),
    })),
  };
}
/**
 * Determina si un valor debe mostrar badge "Revisar":
 * SOLO si supera p99 Y es mayor a 2x la mediana de su unidad.
 * Función pura, sin efectos colaterales.
 */
export function shouldShowReviewBadge(
  value: number,
  p99: number | undefined,
  median: number | undefined,
): boolean {
  if (p99 === undefined || median === undefined) return false;
  return value > p99 && value > median * 2;
}

/**
 * Variante para costo unitario de actividad (ya parseado a number).
 */
export function shouldReviewActivityUnitCost(
  unitCost: number,
  p99ByUnit: Record<string, number>,
  medianByUnit: Record<string, number>,
  unit: string,
): boolean {
  return shouldShowReviewBadge(unitCost, p99ByUnit[unit], medianByUnit[unit]);
}

/**
 * Variante para consumo de insumo (ya parseado a number).
 */
export function shouldReviewItemConsumption(
  consumption: number,
  p99ByUnit: Record<string, number>,
  medianByUnit: Record<string, number>,
  itemUnit: string,
): boolean {
  return shouldShowReviewBadge(consumption, p99ByUnit[itemUnit], medianByUnit[itemUnit]);
}
