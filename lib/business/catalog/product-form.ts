import { gs1CheckDigit } from "./barcode";
import type { ProductKindValue } from "./products-db";

/**
 * Formulario de producto en página (puro): el borrador completo, su validación y los generadores de SKU y código «Auto». El
 * guardado vive en `product-form-db.ts`; aquí no hay nada que toque la base.
 */
export type ProductFormDraft = {
  kind: ProductKindValue;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  categoryId: string;
  brand: string;
  /** Unidad UN/CEFACT (EA, KGM, LTR…). */
  unitCode: string;
  taxCategory: "GRAVADO" | "EXCLUIDO" | "EXENTO";
  taxRatePct: number;
  price: number | null;
  cost: number | null;
  trackStock: boolean;
  initialStock: number | null;
  minStock: number | null;
  maxStock: number | null;
  reorderPoint: number | null;
  durationMinutes: number | null;
  durationDays: number | null;
  capacity: number | null;
  active: boolean;
  favorite: boolean;
  sellable: boolean;
  purchasable: boolean;
  posEnabled: boolean;
  customizable: boolean;
  publishedOnline: boolean;
  internalNotes: string;
  /** Atributos del producto con los valores que ofrece. */
  attributeLines: { attributeId: string; valueIds: string[] }[];
  /** Al guardar, crear las variantes que salen de los atributos. */
  generateVariants: boolean;
};

export const EMPTY_PRODUCT_DRAFT: ProductFormDraft = {
  kind: "PRODUCT",
  name: "",
  description: "",
  sku: "",
  barcode: "",
  categoryId: "",
  brand: "",
  unitCode: "EA",
  taxCategory: "GRAVADO",
  taxRatePct: 19,
  price: null,
  cost: null,
  trackStock: true,
  initialStock: null,
  minStock: null,
  maxStock: null,
  reorderPoint: null,
  durationMinutes: null,
  durationDays: null,
  capacity: null,
  active: true,
  favorite: false,
  sellable: true,
  purchasable: true,
  posEnabled: true,
  customizable: false,
  publishedOnline: false,
  internalNotes: "",
  attributeLines: [],
  generateVariants: true,
};

export type ProductFormErrors = Partial<Record<keyof ProductFormDraft, string>>;

const isCount = (n: number | null) => n == null || (Number.isInteger(n) && n >= 0);

export function validateProductForm(d: ProductFormDraft): { ok: true } | { ok: false; errors: ProductFormErrors } {
  const errors: ProductFormErrors = {};
  if (d.name.trim().length < 2) errors.name = "Escribe el nombre.";
  if (d.price == null || d.price < 0) errors.price = "Escribe el precio de venta.";
  if (d.cost != null && d.cost < 0) errors.cost = "El costo no puede ser negativo.";
  if (d.taxCategory === "GRAVADO" && !(d.taxRatePct >= 0 && d.taxRatePct <= 100)) errors.taxRatePct = "El IVA va de 0 a 100 %.";
  for (const key of ["initialStock", "minStock", "maxStock", "reorderPoint"] as const) {
    if (!isCount(d[key])) errors[key] = "Debe ser un número entero.";
  }
  if (d.maxStock != null && d.minStock != null && d.maxStock < d.minStock) errors.maxStock = "El máximo no puede ser menor que el mínimo.";
  if (d.kind === "PLAN" && !(d.durationDays && d.durationDays > 0)) errors.durationDays = "Indica cuántos días dura el plan.";
  if (d.durationMinutes != null && !(d.durationMinutes > 0)) errors.durationMinutes = "La duración debe ser mayor que cero.";
  if (d.capacity != null && !(Number.isInteger(d.capacity) && d.capacity > 0)) errors.capacity = "El cupo debe ser un número entero mayor que cero.";
  if (d.barcode.trim() && !/^[A-Za-z0-9._\-\s]{3,48}$/.test(d.barcode.trim())) errors.barcode = "Solo letras, números, punto y guion (3 a 48).";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

/** Margen sobre el precio sin impuesto, en %, o `null` si falta el costo o el precio. */
export function marginPct(price: number | null, cost: number | null, taxRatePct = 0, taxCategory: ProductFormDraft["taxCategory"] = "GRAVADO"): number | null {
  if (price == null || cost == null || price <= 0) return null;
  const net = taxCategory === "GRAVADO" ? price / (1 + taxRatePct / 100) : price;
  return Math.round(((net - cost) / net) * 1000) / 10;
}

/** Precio sin impuesto a partir del precio de venta (el que ve la persona incluye el IVA). */
export function priceWithoutTax(price: number | null, taxRatePct: number, taxCategory: ProductFormDraft["taxCategory"]): number | null {
  if (price == null) return null;
  return taxCategory === "GRAVADO" ? Math.round((price / (1 + taxRatePct / 100)) * 100) / 100 : price;
}

/** SKU sugerido: tres letras del nombre y un número corto («CAM-4821»). */
export function suggestSku(name: string, seed = Date.now()): string {
  const letters = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3).padEnd(3, "X");
  return `${letters}-${String(seed % 10000).padStart(4, "0")}`;
}

/** Código EAN-13 propio del negocio: el prefijo 200–299 es de uso interno en GS1, así no choca con los de fábrica. */
export function generateInternalEan13(seed = Math.floor(Math.random() * 1e9)): string {
  const body = `20${String(seed).padStart(10, "0").slice(-10)}`;
  return `${body}${gs1CheckDigit(body)}`;
}

/** Unidades de medida (UN/CEFACT, las que usa la DIAN) con su nombre. */
export const UNIT_OPTIONS: { value: string; label: string }[] = [
  { value: "EA", label: "Unidad" },
  { value: "KGM", label: "Kilogramo" },
  { value: "GRM", label: "Gramo" },
  { value: "LTR", label: "Litro" },
  { value: "MTR", label: "Metro" },
  { value: "MTK", label: "Metro cuadrado" },
  { value: "HUR", label: "Hora" },
  { value: "DAY", label: "Día" },
  { value: "MON", label: "Mes" },
  { value: "SET", label: "Juego" },
  { value: "BX", label: "Caja" },
];

/** Opciones de impuesto del formulario: una sola lista que fija categoría y tarifa. */
export const TAX_OPTIONS: { value: string; label: string; category: ProductFormDraft["taxCategory"]; rate: number }[] = [
  { value: "G19", label: "IVA 19 %", category: "GRAVADO", rate: 19 },
  { value: "G5", label: "IVA 5 %", category: "GRAVADO", rate: 5 },
  { value: "EXCLUIDO", label: "Excluido de IVA", category: "EXCLUIDO", rate: 0 },
  { value: "EXENTO", label: "Exento de IVA", category: "EXENTO", rate: 0 },
];

/** La opción de la lista que corresponde a categoría y tarifa (una tarifa rara se muestra como «IVA n %»). */
export function taxOptionOf(category: ProductFormDraft["taxCategory"], rate: number): string {
  return TAX_OPTIONS.find((o) => o.category === category && o.rate === (category === "GRAVADO" ? rate : 0))?.value ?? (category === "GRAVADO" ? `G${rate}` : category);
}
