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
] as const;
export type ApuUnitValue = (typeof APU_UNITS)[number];

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