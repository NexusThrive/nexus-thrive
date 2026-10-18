import type { ProductKindValue } from "./products-db";

/** Qué vende cada rubro y cómo lo llama (puro). */

export const KIND_LABELS: Record<ProductKindValue, { one: string; many: string; hint: string }> = {
  PRODUCT: { one: "Producto", many: "Productos", hint: "Se vende y lleva inventario." },
  SERVICE: { one: "Servicio", many: "Servicios", hint: "Se agenda: tiene duración y cupo." },
  PLAN: { one: "Plan", many: "Planes", hint: "Membresía con días de vigencia." },
  TICKET: { one: "Entrada", many: "Entradas", hint: "Tipo de entrada de taquilla." },
  TOUR: { one: "Tour", many: "Tours y paquetes", hint: "Recorrido con salidas y cupos." },
};

const BY_VERTICAL: Record<string, ProductKindValue[]> = {
  gym: ["PLAN", "SERVICE", "PRODUCT"],
  museum: ["TICKET", "SERVICE", "PRODUCT"],
  tourism_agency: ["TOUR", "SERVICE", "PRODUCT"],
  tour_guides: ["TOUR", "SERVICE"],
  construction: ["PRODUCT", "SERVICE"],
  events: ["TICKET", "SERVICE", "PRODUCT"],
};

export function kindsForVertical(vertical: string): ProductKindValue[] {
  return BY_VERTICAL[vertical] ?? ["PRODUCT", "SERVICE"];
}

export type ProductDraft = {
  kind: ProductKindValue;
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number | null;
  cost: number | null;
  trackStock: boolean;
  initialStock: number | null;
  minStock: number | null;
  unit: string;
  durationMinutes: number | null;
  durationDays: number | null;
  capacity: number | null;
  active: boolean;
};

export function validateProduct(d: ProductDraft): { ok: true } | { ok: false; errors: Partial<Record<keyof ProductDraft, string>> } {
  const errors: Partial<Record<keyof ProductDraft, string>> = {};
  if (d.name.trim().length < 2) errors.name = "Escribe el nombre.";
  if (d.price == null || d.price < 0) errors.price = "Escribe el precio.";
  if (d.cost != null && d.cost < 0) errors.cost = "El costo no puede ser negativo.";
  const int = (n: number | null) => n == null || (Number.isInteger(n) && n >= 0);
  if (!int(d.minStock)) errors.minStock = "Debe ser un número entero.";
  if (!int(d.initialStock)) errors.initialStock = "Debe ser un número entero.";
  if (d.kind === "PLAN" && !(d.durationDays && d.durationDays > 0)) errors.durationDays = "Indica cuántos días dura el plan.";
  if ((d.kind === "SERVICE" || d.kind === "TOUR") && d.durationMinutes != null && !(d.durationMinutes > 0)) errors.durationMinutes = "La duración debe ser mayor que cero.";
  if (d.capacity != null && !(Number.isInteger(d.capacity) && d.capacity > 0)) errors.capacity = "El cupo debe ser un número entero mayor que cero.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}
