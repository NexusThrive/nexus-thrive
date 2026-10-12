/**
 * Validación servidor del módulo Construcción & APU (mirror de
 * `crm/validators.ts`): sin dependencias, devuelve siempre los valores
 * leídos para repintar formularios y los errores por campo.
 */
import {
  isNonNegative,
  isStrictlyPositive,
  isValidCategory,
  isValidPercent,
  isValidUnit,
} from "@/lib/apu-engine";

/** Tope por porcentaje AIU (configuración de negocio). */
export const AIU_PERCENT_LIMITS = {
  adminPercent: 30,
  imprevPercent: 20,
  utilPercent: 30,
  taxPercent: 30,
} as const;

export const QUANTITY_MAX = 1_000_000;

/* ------------------------------------------------------------------ */
/* Ítem (banco de insumos)                                             */
/* ------------------------------------------------------------------ */

export type ApuItemFormValues = {
  code: string;
  name: string;
  unit: string;
  category: string;
  unitPrice: string;
  /** URL de imagen opcional (solo https). */
  imageUrl?: string;
};

export type ApuItemFieldErrors = Partial<
  Record<keyof ApuItemFormValues, string>
>;

export type ApuItemValidation =
  | { ok: true; values: ApuItemFormValues }
  | { ok: false; errors: ApuItemFieldErrors; values: ApuItemFormValues };

export function validateApuItem(formData: FormData): ApuItemValidation {
  const values: ApuItemFormValues = {
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    name: String(formData.get("name") ?? "").trim(),
    unit: String(formData.get("unit") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    unitPrice: String(formData.get("unitPrice") ?? "").trim(),
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
  };
  const errors: ApuItemFieldErrors = {};

  if (values.code.length > 30) {
    errors.code = "Máximo 30 caracteres.";
  }

  if (values.name.length < 2) {
    errors.name = "Ingresa el nombre del insumo.";
  } else if (values.name.length > 120) {
    errors.name = "Máximo 120 caracteres.";
  }

  if (!isValidUnit(values.unit)) {
    errors.unit = "Selecciona una unidad válida.";
  }

  if (!isValidCategory(values.category)) {
    errors.category = "Selecciona una categoría.";
  }

  if (!isNonNegative(values.unitPrice)) {
    errors.unitPrice = "Precio unitario inválido.";
  }

  // Imagen opcional: si viene, debe ser https y no exceder 500 caracteres.
  const imageUrl = values.imageUrl ?? "";
  if (imageUrl.length > 0) {
    if (!/^https:\/\/\S+$/i.test(imageUrl)) {
      errors.imageUrl = "La imagen debe ser una URL https:// válida.";
    } else if (imageUrl.length > 500) {
      errors.imageUrl = "Máximo 500 caracteres.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }
  return { ok: true, values };
}

/* ------------------------------------------------------------------ */
/* Composición de actividad                                             */
/* ------------------------------------------------------------------ */

export type CompositionValue = {
  itemId: string;
  consumption: string;
  wastePercent: string;
};

export type ApuActivityFormValues = {
  code: string;
  name: string;
  unit: string;
  description: string;
  compositions: CompositionValue[];
};

export type ApuActivityFieldErrors = {
  code?: string;
  name?: string;
  unit?: string;
  description?: string;
  compositions?: string;
};

export type ApuActivityValidation =
  | { ok: true; values: ApuActivityFormValues }
  | { ok: false; errors: ApuActivityFieldErrors; values: ApuActivityFormValues };

/** Lee y valida la composición enviada como JSON (`compositionsJson`). */
function parseCompositions(
  raw: string,
): { values: CompositionValue[] } | { error: string } {
  if (!raw.trim()) {
    return { error: "La actividad necesita al menos un insumo." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Composición inválida." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: "La actividad necesita al menos un insumo." };
  }
  const values: CompositionValue[] = [];
  for (const entry of parsed) {
    const itemId = String((entry as { itemId?: unknown }).itemId ?? "").trim();
    const consumption = String(
      (entry as { consumption?: unknown }).consumption ?? "",
    ).trim();
    const wastePercent = String(
      (entry as { wastePercent?: unknown }).wastePercent ?? "",
    ).trim();
    if (!itemId) {
      return { error: "Cada insumo debe tener un elemento seleccionado." };
    }
    if (!isStrictlyPositive(consumption)) {
      return { error: "El rendimiento debe ser mayor a cero." };
    }
    if (!isValidPercent(wastePercent, 50)) {
      return { error: "Desperdicio entre 0% y 50%." };
    }
    values.push({ itemId, consumption, wastePercent });
  }
  return { values };
}

export function validateApuActivity(
  formData: FormData,
): ApuActivityValidation {
  const values: ApuActivityFormValues = {
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    name: String(formData.get("name") ?? "").trim(),
    unit: String(formData.get("unit") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    compositions: [],
  };
  const errors: ApuActivityFieldErrors = {};

  if (values.code.length > 30) {
    errors.code = "Máximo 30 caracteres.";
  }
  if (values.name.length < 2) {
    errors.name = "Ingresa el nombre de la actividad.";
  } else if (values.name.length > 120) {
    errors.name = "Máximo 120 caracteres.";
  }
  if (!isValidUnit(values.unit)) {
    errors.unit = "Selecciona una unidad válida.";
  }
  if (values.description.length > 500) {
    errors.description = "Máximo 500 caracteres.";
  }

  const compositionResult = parseCompositions(
    String(formData.get("compositionsJson") ?? ""),
  );
  if ("error" in compositionResult) {
    errors.compositions = compositionResult.error;
  } else {
    values.compositions = compositionResult.values;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }
  return { ok: true, values };
}

/* ------------------------------------------------------------------ */
/* Composición APU (agregar / quitar insumo de una actividad)          */
/* ------------------------------------------------------------------ */

export type CompositionFormValues = {
  activityId: string;
  itemId: string;
  consumption: string;
  wastePercent: string;
};

export type CompositionValidation =
  | { ok: true; values: CompositionFormValues }
  | { ok: false; error: string; values: CompositionFormValues };

/**
 * Valida una línea de composición suelta (insumo + rendimiento + desperdicio).
 * Reglas de negocio: rendimiento > 0 y desperdicio entre 0% y 50%. El
 * desperdicio vacío se interpreta como 0 (insumo sin pérdida).
 */
export function validateComposition(
  formData: FormData,
): CompositionValidation {
  const wasteRaw = String(formData.get("wastePercent") ?? "").trim();
  const values: CompositionFormValues = {
    activityId: String(formData.get("activityId") ?? "").trim(),
    itemId: String(formData.get("itemId") ?? "").trim(),
    consumption: String(formData.get("consumption") ?? "").trim(),
    wastePercent: wasteRaw === "" ? "0" : wasteRaw,
  };

  if (!values.activityId) {
    return { ok: false, error: "Actividad no indicada.", values };
  }
  if (!values.itemId) {
    return { ok: false, error: "Selecciona un insumo.", values };
  }
  if (!isStrictlyPositive(values.consumption)) {
    return { ok: false, error: "El rendimiento debe ser mayor a cero.", values };
  }
  if (!isValidPercent(values.wastePercent, 50)) {
    return {
      ok: false,
      error: "El desperdicio debe estar entre 0% y 50%.",
      values,
    };
  }

  return { ok: true, values };
}

/* ------------------------------------------------------------------ */
/* Presupuesto (aiu + líneas)                                          */
/* ------------------------------------------------------------------ */

export type QuoteLineValue = {
  activityId: string;
  quantity: string;
};

export type QuoteFormValues = {
  customerId: string;
  title: string;
  items: QuoteLineValue[];
  adminPercent: string;
  imprevPercent: string;
  utilPercent: string;
  taxPercent: string;
};

export type QuoteFieldErrors = {
  customerId?: string;
  title?: string;
  items?: string;
  adminPercent?: string;
  imprevPercent?: string;
  utilPercent?: string;
  taxPercent?: string;
};

export type QuoteValidation =
  | { ok: true; values: QuoteFormValues }
  | { ok: false; errors: QuoteFieldErrors; values: QuoteFormValues };

/** Lee y valida las líneas del presupuesto (`itemsJson`). */
function parseItems(
  raw: string,
): { values: QuoteLineValue[] } | { error: string } {
  if (!raw.trim()) {
    return { error: "Agrega al menos una actividad al presupuesto." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Líneas del presupuesto inválidas." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: "Agrega al menos una actividad al presupuesto." };
  }
  const values: QuoteLineValue[] = [];
  for (const entry of parsed) {
    const activityId = String(
      (entry as { activityId?: unknown }).activityId ?? "",
    ).trim();
    const quantity = String(
      (entry as { quantity?: unknown }).quantity ?? "",
    ).trim();
    if (!activityId) {
      return { error: "Cada línea debe tener una actividad." };
    }
    const parsedQuantity = Number(quantity);
    if (
      !isStrictlyPositive(quantity.replace(",", ".")) ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      parsedQuantity > QUANTITY_MAX
    ) {
      return { error: "Cantidad inválida (mayor a 0, máx. 1.000.000)." };
    }
    values.push({ activityId, quantity });
  }
  return { values };
}

export function validateQuote(formData: FormData): QuoteValidation {
  const values: QuoteFormValues = {
    customerId: String(formData.get("customerId") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    items: [],
    adminPercent: String(formData.get("adminPercent") ?? "").trim(),
    imprevPercent: String(formData.get("imprevPercent") ?? "").trim(),
    utilPercent: String(formData.get("utilPercent") ?? "").trim(),
    taxPercent: String(formData.get("taxPercent") ?? "").trim(),
  };
  const errors: QuoteFieldErrors = {};

  if (values.customerId.length > 40) {
    errors.customerId = "Cliente no válido.";
  }
  if (values.title.length < 2) {
    errors.title = "Ingresa un nombre para el presupuesto.";
  } else if (values.title.length > 120) {
    errors.title = "Máximo 120 caracteres.";
  }

  const itemResult = parseItems(String(formData.get("itemsJson") ?? ""));
  if ("error" in itemResult) {
    errors.items = itemResult.error;
  } else {
    values.items = itemResult.values;
  }

  for (const key of [
    "adminPercent",
    "imprevPercent",
    "utilPercent",
    "taxPercent",
  ] as const) {
    const limit = AIU_PERCENT_LIMITS[key];
    if (!isValidPercent(values[key], limit)) {
      errors[key] = `Entre 0% y ${limit}%.`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }
  return { ok: true, values };
}

/* ------------------------------------------------------------------ */
/* Import CSV (atomicidad por transacción)                             */
/* ------------------------------------------------------------------ */

export type ImportCsvRow = {
  code: string | null;
  name: string;
  unit: string;
  category: string;
  unitPrice: string;
};

export type ImportCsvResult =
  | { ok: true; rows: ImportCsvRow[] }
  | { ok: false; errors: string[] };

/**
 * Parsea CSV de banco de insumos: columnas `code,name,unit,category,unitPrice`.
 * Primera línea de encabezado opcional (se detecta). Líneas inválidas se
 * reportan con su número; si hay CUALQUIER error, no se importa nada
 * (la transacción solo se abre cuando `ok`).
 */
export function parseImportCsv(raw: string): ImportCsvResult {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { ok: false, errors: ["Pega o sube al menos una línea."] };
  }

  // Detección de encabezado (caso-insensitive).
  const first = lines[0].toLowerCase();
  const hasHeader =
    first.includes("code") || first.includes("nombre") || first.includes("name");

  const errors: string[] = [];
  const rows: ImportCsvRow[] = [];
  const start = hasHeader ? 1 : 0;

  for (let index = start; index < lines.length; index += 1) {
    const parts = lines[index].split(",").map((part) => part.trim());
    if (parts.length !== 5) {
      errors.push(
        `Línea ${index + 1}: se esperaban 5 columnas (código,nombre,unidad,categoría,precio).`,
      );
      continue;
    }
    const [code, name, unit, category, unitPrice] = parts;
    if (!name || name.length < 2 || name.length > 120) {
      errors.push(`Línea ${index + 1}: nombre inválido.`);
      continue;
    }
    if (!isValidUnit(unit)) {
      errors.push(`Línea ${index + 1}: unidad "${unit}" no válida.`);
      continue;
    }
    if (!isValidCategory(category)) {
      errors.push(`Línea ${index + 1}: categoría "${category}" no válida.`);
      continue;
    }
    if (!isNonNegative(unitPrice)) {
      errors.push(`Línea ${index + 1}: precio unitario inválido.`);
      continue;
    }
    rows.push({
      code: code === "" ? null : code.toUpperCase(),
      name,
      unit,
      category,
      unitPrice,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, rows };
}