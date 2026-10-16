import { isValidPhotoUrl } from "@/lib/field-log-engine";
export type CreateFieldLogEntryValues = {
  type: "ADVANCE" | "OBSERVATION" | "AUTHORIZATION" | "INCIDENT";
  entryDate: string; // YYYY-MM-DD
  title: string;
  description: string;
  weather: "SUNNY" | "CLOUDY" | "RAIN_LIGHT" | "RAIN_HEAVY";
  laborCount: number;
  photoUrls: string[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = new Set(["ADVANCE", "OBSERVATION", "AUTHORIZATION", "INCIDENT"]);
const WEATHER = new Set(["SUNNY", "CLOUDY", "RAIN_LIGHT", "RAIN_HEAVY"]);

function isValidUrl(u: string): boolean {
  return isValidPhotoUrl(u);
}

export function validateCreateFieldLogEntry(input: unknown) {
  const raw = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string[]> = {};

  const type = String(raw.type ?? "");
  if (!TYPES.has(type)) {
    errors.type = ["Tipo de anotación inválido."];
  }

  const entryDate = String(raw.entryDate ?? "").trim();
  if (!DATE_RE.test(entryDate)) {
    errors.entryDate = ["Formato de fecha inválido (YYYY-MM-DD)."];
  }

  const title = String(raw.title ?? "").trim();
  if (title.length === 0) errors.title = ["El título es requerido."];
  else if (title.length > 120) errors.title = ["Máximo 120 caracteres."];

  const description = String(raw.description ?? "").trim();
  if (description.length === 0) errors.description = ["La descripción es requerida."];
  else if (description.length > 2000) errors.description = ["Máximo 2000 caracteres."];

  const weather = String(raw.weather ?? "");
  if (!WEATHER.has(weather)) {
    errors.weather = ["Condición meteorológica inválida."];
  }

  const laborCount = Number(raw.laborCount);
  if (!Number.isFinite(laborCount) || !Number.isInteger(laborCount)) {
    errors.laborCount = ["Debe ser un número entero."];
  } else if (laborCount < 0 || laborCount > 1000) {
    errors.laborCount = ["El número de operarios debe estar entre 0 y 1000."];
  }

  let photoUrls: string[] = [];
  const rawUrls = raw.photoUrls;
  if (Array.isArray(rawUrls)) {
    for (const u of rawUrls) {
      const s = String(u ?? "").trim();
      if (s.length > 0) {
        if (!isValidUrl(s)) {
          errors.photoUrls = ["Foto no válida."];
          break;
        }
        photoUrls.push(s);
      }
    }
    if (photoUrls.length > 10) {
      errors.photoUrls = ["Máximo 10 fotografías por anotación."];
      photoUrls = photoUrls.slice(0, 10);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors, values: null };
  }

  return {
    ok: true as const,
    errors: {},
    values: {
      type: type as CreateFieldLogEntryValues["type"],
      entryDate,
      title,
      description,
      weather: weather as CreateFieldLogEntryValues["weather"],
      laborCount,
      photoUrls,
    },
  };
}