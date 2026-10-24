/**
 * Ficha de Google Business por la API de Google Places (New). El negocio pone su ID de lugar y su propia llave
 * de API; NEXUS lee lo que Google muestra (nombre, dirección, teléfono, sitio, calificación y reseñas) y lo
 * compara con lo que NEXUS tiene. Solo LECTURA: NEXUS no edita la ficha de Google.
 *
 * Nota: el formato de la API sigue su documentación pública; no se probó contra Google real (sin llave aquí).
 */
export type Place = { name: string | null; address: string | null; phone: string | null; website: string | null; rating: number | null; ratingCount: number | null };

export const PLACE_ID = /^ChI[A-Za-z0-9_-]{10,}$/;
const FIELDS = "displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount";

export class PlacesError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}

/** Lee el lugar. Los errores se traducen a mensajes que la persona pueda arreglar. */
export async function fetchPlace(placeId: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<Place> {
  if (!PLACE_ID.test(placeId)) throw new PlacesError("El ID de lugar no parece válido (empieza por «ChIJ»).");
  let res: Response;
  try {
    res = await fetchImpl(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es`, { headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELDS }, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new PlacesError("No se pudo contactar a Google. Inténtalo de nuevo.", true);
  }
  if (res.status === 404) throw new PlacesError("Google no encontró ese lugar. Revisa el ID de lugar.");
  if (res.status === 400 || res.status === 403) throw new PlacesError("Google rechazó la llave: revisa que la API «Places API (New)» esté activada y que la llave no esté restringida de más.");
  if (res.status === 429 || res.status >= 500) throw new PlacesError(`Google respondió ${res.status}. Inténtalo más tarde.`, true);
  if (!res.ok) throw new PlacesError(`Google respondió ${res.status}.`);
  const body = (await res.json().catch(() => null)) as { displayName?: { text?: string }; formattedAddress?: string; nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string; rating?: number; userRatingCount?: number } | null;
  if (!body) throw new PlacesError("La respuesta de Google no se entiende.", true);
  return { name: body.displayName?.text ?? null, address: body.formattedAddress ?? null, phone: body.internationalPhoneNumber ?? body.nationalPhoneNumber ?? null, website: body.websiteUri ?? null, rating: typeof body.rating === "number" ? body.rating : null, ratingCount: typeof body.userRatingCount === "number" ? body.userRatingCount : null };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => new Set(norm(s).split(" ").filter((t) => t.length > 1));
/** ¿Dos textos hablan de lo mismo? Compara palabras (sin tildes ni signos): al menos 60 % de las del más corto. */
export function similar(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return false;
  const [small, big] = x.size <= y.size ? [x, y] : [y, x];
  let hit = 0;
  for (const t of small) if (big.has(t)) hit++;
  return hit / small.size >= 0.6;
}
const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-10);
const host = (u: string | null | undefined) => { try { return u ? new URL(u).hostname.replace(/^www\./, "").toLowerCase() : ""; } catch { return ""; } };

export type NapRow = { field: "name" | "address" | "phone" | "website"; label: string; nexus: string | null; google: string | null; match: boolean };

/** Nombre, dirección, teléfono y sitio: lo que el negocio dice (NEXUS) contra lo que Google muestra. Un dato que falta en NEXUS no cuenta como error. */
export function napCheck(nexus: { name: string; address: string | null; phone: string | null; website: string | null }, google: Place): NapRow[] {
  return [
    { field: "name", label: "Nombre", nexus: nexus.name, google: google.name, match: similar(nexus.name, google.name) },
    { field: "address", label: "Dirección", nexus: nexus.address, google: google.address, match: nexus.address ? similar(nexus.address, google.address) : true },
    { field: "phone", label: "Teléfono", nexus: nexus.phone, google: google.phone, match: nexus.phone ? digits(nexus.phone).length >= 7 && digits(nexus.phone) === digits(google.phone) : true },
    { field: "website", label: "Sitio web", nexus: nexus.website, google: google.website, match: nexus.website ? host(nexus.website) !== "" && host(nexus.website) === host(google.website) : true },
  ];
}
