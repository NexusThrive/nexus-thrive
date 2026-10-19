/**
 * Campos del cliente según el rubro (puro). Lo común vive en columnas
 * (documento, cumpleaños, ciudad, etiquetas); lo propio del rubro en
 * `Customer.profile` (JSON) con estas definiciones.
 */

export type FieldDef =
  | { key: string; label: string; type: "text"; placeholder?: string; hint?: string }
  | { key: string; label: string; type: "number"; unit: string; min: number; max: number }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "textarea"; placeholder?: string };

export type VerticalProfile = { title: string; fields: FieldDef[]; documentLabel: string; photo: boolean; planOnCreate: boolean };

const BASE: VerticalProfile = { title: "Datos adicionales", fields: [], documentLabel: "Cédula o NIT", photo: false, planOnCreate: false };

const PROFILES: Record<string, VerticalProfile> = {
  gym: {
    title: "Ficha del gimnasio",
    documentLabel: "Cédula",
    photo: true,
    planOnCreate: true,
    fields: [
      { key: "weightKg", label: "Peso", type: "number", unit: "kg", min: 20, max: 350 },
      { key: "heightCm", label: "Estatura", type: "number", unit: "cm", min: 90, max: 250 },
      { key: "goal", label: "Objetivo", type: "select", options: ["Bajar de peso", "Ganar masa muscular", "Tonificar", "Salud y bienestar", "Rendimiento deportivo", "Rehabilitación"] },
      { key: "health", label: "Condiciones de salud o lesiones", type: "textarea", placeholder: "Hipertensión, lesión de rodilla…" },
      { key: "emergencyName", label: "Contacto de emergencia", type: "text" },
      { key: "emergencyPhone", label: "Teléfono de emergencia", type: "text" },
    ],
  },
  tourism_agency: {
    title: "Datos del viajero",
    documentLabel: "Documento o pasaporte",
    photo: false,
    planOnCreate: false,
    fields: [
      { key: "nationality", label: "Nacionalidad", type: "text", placeholder: "Colombiana" },
      { key: "documentType", label: "Tipo de documento", type: "select", options: ["Cédula", "Pasaporte", "Cédula de extranjería", "Tarjeta de identidad"] },
      { key: "diet", label: "Alimentación o salud", type: "textarea", placeholder: "Vegetariano, alergia a mariscos…" },
      { key: "emergencyName", label: "Contacto de emergencia", type: "text" },
      { key: "emergencyPhone", label: "Teléfono de emergencia", type: "text" },
    ],
  },
  museum: {
    title: "Datos del visitante",
    documentLabel: "Documento",
    photo: false,
    planOnCreate: false,
    fields: [
      { key: "visitorType", label: "Tipo de visitante", type: "select", options: ["Individual", "Familia", "Colegio", "Universidad", "Empresa", "Turista extranjero"] },
      { key: "institution", label: "Institución", type: "text", placeholder: "Colegio San José" },
      { key: "groupSize", label: "Tamaño del grupo", type: "number", unit: "personas", min: 1, max: 500 },
    ],
  },
  construction: {
    title: "Datos del cliente",
    documentLabel: "NIT o cédula",
    photo: false,
    planOnCreate: false,
    fields: [
      { key: "company", label: "Empresa", type: "text" },
      { key: "contactRole", label: "Cargo del contacto", type: "text", placeholder: "Gerente de proyectos" },
      { key: "address", label: "Dirección", type: "text" },
    ],
  },
};
PROFILES.tour_guides = PROFILES.tourism_agency;
PROFILES.events = PROFILES.museum;

export function profileFor(vertical: string): VerticalProfile {
  return PROFILES[vertical] ?? BASE;
}

/** Limpia y valida el perfil según las definiciones; descarta claves ajenas. */
export function cleanProfile(vertical: string, raw: Record<string, unknown>): { ok: true; value: Record<string, string | number> } | { ok: false; field: string; message: string } {
  const out: Record<string, string | number> = {};
  for (const f of profileFor(vertical).fields) {
    const v = raw[f.key];
    if (v == null || v === "") continue;
    if (f.type === "number") {
      const n = Number(String(v).replace(",", "."));
      if (!Number.isFinite(n) || n < f.min || n > f.max) return { ok: false, field: f.key, message: `${f.label}: entre ${f.min} y ${f.max} ${f.unit}.` };
      out[f.key] = Math.round(n * 10) / 10;
    } else if (f.type === "select") {
      if (!f.options.includes(String(v))) return { ok: false, field: f.key, message: `${f.label}: opción no válida.` };
      out[f.key] = String(v);
    } else out[f.key] = String(v).trim().slice(0, f.type === "textarea" ? 500 : 120);
  }
  return { ok: true, value: out };
}

/** Índice de masa corporal (gym). */
export function bmi(weightKg?: number, heightCm?: number): { value: number; label: string } | null {
  if (!weightKg || !heightCm) return null;
  const v = Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10;
  return { value: v, label: v < 18.5 ? "Bajo peso" : v < 25 ? "Normal" : v < 30 ? "Sobrepeso" : "Obesidad" };
}

/** Tipo de membresía según los días del plan. */
export function membershipTypeFor(days: number): "mensual" | "trimestral" | "anual" {
  return days <= 45 ? "mensual" : days <= 120 ? "trimestral" : "anual";
}
