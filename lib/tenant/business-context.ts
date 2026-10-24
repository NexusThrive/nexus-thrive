import { isVertical, VERTICALS, type VerticalValue } from "@/lib/admin/catalogs";

/**
 * Perfil del negocio como CONTEXTO (no como restricción): perfil de partida
 * (vocabulario y sugerencias), modelo comercial y actividad. Cambiarlo no
 * borra ni apaga nada.
 */
export const BUSINESS_MODELS = [
  { value: "B2B", label: "Empresas (B2B)", hint: "Vendes a otras empresas." },
  { value: "B2C", label: "Personas (B2C)", hint: "Vendes a consumidores finales." },
  { value: "B2B2C", label: "A través de terceros (B2B2C)", hint: "Vendes mediante aliados que atienden al consumidor." },
] as const;
export type BusinessModel = (typeof BUSINESS_MODELS)[number]["value"];

export type BusinessContext = { vertical: VerticalValue; businessModels: BusinessModel[]; activity: string };

export const MAX_ACTIVITY = 120;

/** Valida y normaliza lo que llega del formulario; devuelve el mensaje de error si algo no sirve. */
export function parseBusinessContext(input: { vertical: unknown; businessModels: unknown; activity: unknown }): { ok: true; value: BusinessContext } | { ok: false; message: string; field: "vertical" | "businessModels" | "activity" } {
  const vertical = String(input.vertical ?? "");
  if (!isVertical(vertical) || !(VERTICALS as readonly string[]).includes(vertical)) return { ok: false, field: "vertical", message: "Elige un perfil válido." };
  const raw = Array.isArray(input.businessModels) ? input.businessModels.map(String) : [];
  const allowed = new Set<string>(BUSINESS_MODELS.map((m) => m.value));
  if (raw.some((m) => !allowed.has(m))) return { ok: false, field: "businessModels", message: "El modelo comercial no es válido." };
  const activity = String(input.activity ?? "").trim().replace(/\s+/g, " ");
  if (activity.length > MAX_ACTIVITY) return { ok: false, field: "activity", message: `Máximo ${MAX_ACTIVITY} caracteres.` };
  return { ok: true, value: { vertical, businessModels: [...new Set(raw)] as BusinessModel[], activity } };
}
