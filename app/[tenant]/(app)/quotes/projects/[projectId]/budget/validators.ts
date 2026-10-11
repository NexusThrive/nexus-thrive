/**
 * Validación servidor del presupuestador APU & AIU (FASE 2 del vertical
 * construcción — Tab 2). Mirror de `projects/validators.ts`: sin dependencias
 * de servidor, devuelve siempre los valores leídos (para repintar formularios)
 * y los errores por campo. Las conversiones a micro-unidades reutilizan el
 * motor `@/lib/apu-engine` (nunca se parsea dinero a `number`).
 */
import { isValidPercent, parseMoney, percentToMicro } from "@/lib/apu-engine";
import type {
  AiuConfigInput,
  CreateBudgetItemInput,
  CreateChapterInput,
} from "@/lib/tenant-db";

export const CHAPTER_NAME_MAX = 120;
export const CHAPTER_DESCRIPTION_MAX = 300;
export const ITEM_CODE_MAX = 32;
export const ITEM_DESCRIPTION_MAX = 300;
export const UNIT_MAX = 16;

/** Tope de cantidad por partida (unidades). */
export const QUANTITY_MAX = 1_000_000_000;
/** Tope de costo unitario directo (COP). */
export const UNIT_COST_MAX = 1_000_000_000_000;

/** Límites AIU (porcentaje máximo aceptado). */
export const AIU_ADMIN_MAX = 30;
export const AIU_IMPREV_MAX = 20;
export const AIU_UTILIDAD_MAX = 30;
export const AIU_IVA_MAX = 30;

function within(value: string, max: number): boolean {
  return value.length <= max;
}

/* ------------------------------------------------------------------ */
/* Capítulos                                                           */
/* ------------------------------------------------------------------ */

export type ChapterFormValues = {
  name: string;
  description: string;
};

export type ChapterFieldErrors = Partial<
  Record<keyof ChapterFormValues, string>
>;

export type ChapterValidation =
  | { ok: true; values: ChapterFormValues; input: CreateChapterInput }
  | {
      ok: false;
      errors: ChapterFieldErrors;
      values: ChapterFormValues;
    };

export function validateCreateChapter(formData: FormData): ChapterValidation {
  const values: ChapterFormValues = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  };
  const errors: ChapterFieldErrors = {};

  if (values.name.length === 0) {
    errors.name = "Ingresa el nombre del capítulo.";
  } else if (!within(values.name, CHAPTER_NAME_MAX)) {
    errors.name = `Máximo ${CHAPTER_NAME_MAX} caracteres.`;
  }
  if (!within(values.description, CHAPTER_DESCRIPTION_MAX)) {
    errors.description = `Máximo ${CHAPTER_DESCRIPTION_MAX} caracteres.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }
  return {
    ok: true,
    values,
    input: {
      name: values.name,
      description: values.description === "" ? undefined : values.description,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Partidas (ítems)                                                    */
/* ------------------------------------------------------------------ */

export type BudgetItemFormValues = {
  chapterId: string;
  code: string;
  description: string;
  unit: string;
  quantity: string;
  unitCost: string;
};

export type BudgetItemFieldErrors = Partial<
  Record<keyof BudgetItemFormValues, string>
>;

export type BudgetItemValidation =
  | { ok: true; values: BudgetItemFormValues; input: CreateBudgetItemInput }
  | {
      ok: false;
      errors: BudgetItemFieldErrors;
      values: BudgetItemFormValues;
    };

export function validateCreateBudgetItem(
  formData: FormData,
): BudgetItemValidation {
  const values: BudgetItemFormValues = {
    chapterId: String(formData.get("chapterId") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    unit: String(formData.get("unit") ?? "").trim(),
    quantity: String(formData.get("quantity") ?? "").trim(),
    unitCost: String(formData.get("unitCost") ?? "").trim(),
  };
  const errors: BudgetItemFieldErrors = {};

  if (values.chapterId.length === 0) {
    errors.chapterId = "Selecciona el capítulo de la partida.";
  }
  if (values.description.length === 0) {
    errors.description = "Ingresa la descripción de la partida.";
  } else if (!within(values.description, ITEM_DESCRIPTION_MAX)) {
    errors.description = `Máximo ${ITEM_DESCRIPTION_MAX} caracteres.`;
  }
  if (!within(values.code, ITEM_CODE_MAX)) {
    errors.code = `Máximo ${ITEM_CODE_MAX} caracteres.`;
  }
  if (values.unit.length === 0) {
    errors.unit = "Ingresa la unidad de medida.";
  } else if (!within(values.unit, UNIT_MAX)) {
    errors.unit = `Máximo ${UNIT_MAX} caracteres.`;
  }

  const quantity = parseMoney(values.quantity);
  if (quantity === null) {
    errors.quantity = "Cantidad inválida (máx. 6 decimales).";
  } else if (quantity <= BigInt(0)) {
    errors.quantity = "La cantidad debe ser mayor que cero.";
  } else if (quantity > BigInt(QUANTITY_MAX) * BigInt(1_000_000)) {
    errors.quantity = `La cantidad no puede superar ${QUANTITY_MAX.toLocaleString("es-CO")}.`;
  }

  const unitCost = parseMoney(values.unitCost);
  if (unitCost === null) {
    errors.unitCost = "Costo unitario inválido (máx. 6 decimales).";
  } else if (unitCost < BigInt(0)) {
    errors.unitCost = "El costo unitario no puede ser negativo.";
  } else if (unitCost > BigInt(UNIT_COST_MAX) * BigInt(1_000_000)) {
    errors.unitCost = `El costo unitario no puede superar ${UNIT_COST_MAX.toLocaleString("es-CO")}.`;
  }

  if (
    Object.keys(errors).length > 0 ||
    quantity === null ||
    unitCost === null
  ) {
    return { ok: false, errors, values };
  }
  return {
    ok: true,
    values,
    input: {
      chapterId: values.chapterId,
      code: values.code,
      description: values.description,
      unit: values.unit,
      quantity,
      unitCostDirect: unitCost,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Configuración AIU                                                   */
/* ------------------------------------------------------------------ */

export type AiuFormValues = {
  adminPct: string;
  imprevPct: string;
  utilidadPct: string;
  ivaUtilidadPct: string;
};

export type AiuFieldErrors = Partial<Record<keyof AiuFormValues, string>>;

export type AiuValidation =
  | { ok: true; values: AiuFormValues; input: AiuConfigInput }
  | { ok: false; errors: AiuFieldErrors; values: AiuFormValues };

type AiuField = {
  key: keyof AiuFormValues;
  max: number;
  label: string;
};

const AIU_FIELDS: readonly AiuField[] = [
  { key: "adminPct", max: AIU_ADMIN_MAX, label: "administración" },
  { key: "imprevPct", max: AIU_IMPREV_MAX, label: "imprevistos" },
  { key: "utilidadPct", max: AIU_UTILIDAD_MAX, label: "utilidad" },
  { key: "ivaUtilidadPct", max: AIU_IVA_MAX, label: "IVA sobre utilidad" },
];

export function validateAiuConfig(formData: FormData): AiuValidation {
  const values: AiuFormValues = {
    adminPct: String(formData.get("adminPct") ?? "").trim(),
    imprevPct: String(formData.get("imprevPct") ?? "").trim(),
    utilidadPct: String(formData.get("utilidadPct") ?? "").trim(),
    ivaUtilidadPct: String(formData.get("ivaUtilidadPct") ?? "").trim(),
  };
  const errors: AiuFieldErrors = {};

  for (const field of AIU_FIELDS) {
    const raw = values[field.key];
    if (raw.length === 0) {
      errors[field.key] = `Ingresa el porcentaje de ${field.label}.`;
    } else if (!isValidPercent(raw, field.max)) {
      errors[field.key] = `Porcentaje inválido (0 a ${field.max} %, máx. 6 decimales).`;
    }
  }

  const adminPct = percentToMicro(values.adminPct);
  const imprevPct = percentToMicro(values.imprevPct);
  const utilidadPct = percentToMicro(values.utilidadPct);
  const ivaUtilidadPct = percentToMicro(values.ivaUtilidadPct);

  if (
    Object.keys(errors).length > 0 ||
    adminPct === null ||
    imprevPct === null ||
    utilidadPct === null ||
    ivaUtilidadPct === null
  ) {
    return { ok: false, errors, values };
  }
  return {
    ok: true,
    values,
    input: { adminPct, imprevPct, utilidadPct, ivaUtilidadPct },
  };
}
