/**
 * Motor de estadísticas de la Bitácora de Campo (FASE 4 — Tab 4).
 *
 * Funciones puras, tipadas y sin dependencias de base de datos.
 * Calcula métricas agregadas sobre anotaciones de FieldLogEntry.
 */

/** Tipos de anotación en la bitácora (espejo del enum del contrato). */
export const FIELD_NOTE_TYPES = [
  { value: "ADVANCE", label: "AVANCE" },
  { value: "OBSERVATION", label: "OBSERVACIÓN" },
  { value: "AUTHORIZATION", label: "AUTORIZACIÓN" },
  { value: "INCIDENT", label: "INCIDENTE" },
] as const;
export type FieldNoteTypeValue = (typeof FIELD_NOTE_TYPES)[number]["value"];

/** Condiciones meteorológicas (espejo del enum del contrato). */
export const WEATHER_CONDITIONS = [
  { value: "SUNNY", label: "Soleado" },
  { value: "CLOUDY", label: "Nublado" },
  { value: "RAIN_LIGHT", label: "Lluvia ligera" },
  { value: "RAIN_HEAVY", label: "Lluvia fuerte" },
] as const;
export type WeatherConditionValue = (typeof WEATHER_CONDITIONS)[number]["value"];

/** Anotación de bitácora serializada para el motor (lo que devuelve tenant-db). */
export type FieldLogEntryData = {
  id: string;
  type: FieldNoteTypeValue;
  title: string;
  description: string;
  weather: WeatherConditionValue;
  laborCount: number;
  authorName: string;
  authorRole: string;
  photoUrls: string[];
  entryDate: string; // "YYYY-MM-DD" Bogotá
  /** Partida del presupuesto a la que se refiere (opcional). */
  budgetItemId?: string | null;
};

/**
 * Devuelve estadísticas agregadas de un conjunto de anotaciones.
 *
 * Reglas:
 * - Si no hay entradas, todos los indicadores son 0.
 * - `averageLabor` es el promedio de `laborCount` por anotación (redondeo a 1 decimal).
 * - `totalPhotos` cuenta solo URLs no vacías (strings con longitud > 0).
 */
export function getLogSummaryStats(
  entries: ReadonlyArray<FieldLogEntryData>,
): {
  totalEntries: number;
  advancesCount: number;
  incidentsCount: number;
  averageLabor: number;
  totalPhotos: number;
} {
  const totalEntries = entries.length;

  if (totalEntries === 0) {
    return {
      totalEntries: 0,
      advancesCount: 0,
      incidentsCount: 0,
      averageLabor: 0,
      totalPhotos: 0,
    };
  }

  let advancesCount = 0;
  let incidentsCount = 0;
  let laborSum = 0;
  let totalPhotos = 0;

  for (const entry of entries) {
    if (entry.type === "ADVANCE") {
      advancesCount += 1;
    }
    if (entry.type === "INCIDENT") {
      incidentsCount += 1;
    }
    laborSum += entry.laborCount ?? 0;
    for (const url of entry.photoUrls ?? []) {
      if (isValidPhotoUrl(url)) {
        totalPhotos += 1;
      }
    }
  }

  // Promedio con un decimal (p. ej. 2.5 operarios por anotación).
  const averageLabor = Math.round((laborSum / totalEntries) * 10) / 10;

  return {
    totalEntries,
    advancesCount,
    incidentsCount,
    averageLabor,
    totalPhotos,
  };
}

/** Etiqueta legible para un tipo de anotación. */
export function fieldNoteTypeLabel(type: FieldNoteTypeValue): string {
  return FIELD_NOTE_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Etiqueta legible para una condición meteorológica. */
export function weatherConditionLabel(weather: WeatherConditionValue): string {
  return WEATHER_CONDITIONS.find((w) => w.value === weather)?.label ?? weather;
}

/** Valida que un string sea un tipo de anotación válido. */
export function isValidFieldNoteType(raw: string): raw is FieldNoteTypeValue {
  return FIELD_NOTE_TYPES.some((t) => t.value === raw);
}

/** Valida que un string sea una condición meteorológica válida. */
export function isValidWeatherCondition(
  raw: string,
): raw is WeatherConditionValue {
  return WEATHER_CONDITIONS.some((w) => w.value === raw);
}

/** Valida que una URL sea HTTPS (no vacía y con protocolo permitido). */
/** Foto guardada en el sistema (ver app/api/apu-images). */
const INTERNAL_PHOTO = /^\/api\/apu-images\/[0-9a-f-]{36}$/i;

export function isValidPhotoUrl(raw: string): boolean {
  if (INTERNAL_PHOTO.test(raw)) return true;
  try {
    const url = new URL(raw);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Filtra y normaliza un array de URLs de fotos: solo HTTPS no vacías, máx 10. */
export function normalizePhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const urls = raw
    .map((u) => (typeof u === "string" ? u.trim() : ""))
    .filter((u) => u.length > 0 && isValidPhotoUrl(u));
  // Límite razonable de negocio: máx 10 fotos por anotación.
  return urls.slice(0, 10);
}