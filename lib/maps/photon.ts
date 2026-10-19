/**
 * Autocompletado de direcciones con Photon (Komoot), el geocoder libre
 * basado en OpenStreetMap. No requiere API key ni facturación.
 *
 * Política de uso justo: se llama con debounce desde el navegador y con
 * pocos resultados; el `Referer` del navegador sirve como identificación.
 */

const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";
const COUNTRY_CODE = "CO";

type PhotonFeature = {
  geometry?: { coordinates?: unknown };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};

/** Sugerencia normalizada, ya lista para pintar en el listbox. */
export type PlaceSuggestion = {
  id: string;
  primary: string;
  secondary: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
};

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Convierte una feature de Photon en sugerencia; `null` si no es utilizable. */
export function toSuggestion(feature: PhotonFeature, index: number): PlaceSuggestion | null {
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const props = feature.properties ?? {};
  const streetLine = [clean(props.street), clean(props.housenumber)].filter(Boolean).join(" ");
  const name = clean(props.name);
  const city = clean(props.city) || clean(props.county) || clean(props.state);
  const state = clean(props.state);
  const country = clean(props.country);

  const primary = name || streetLine || city || state || "Ubicación";
  const secondary = [city, state, country].filter(Boolean).join(", ");
  const address = [...new Set([name, streetLine, city, state, country].filter(Boolean))].join(", ");

  return {
    id: `${props.osm_type ?? "osm"}${props.osm_id ?? `${latitude},${longitude}-${index}`}`,
    primary,
    secondary,
    address: address || primary,
    city: city || undefined,
    latitude,
    longitude,
  };
}

/**
 * Busca direcciones/lugares con Photon. Sin clave ni configuración; si la red
 * falla lanza, y el campo se comporta como texto libre.
 */
export async function searchPlaces(
  query: string,
  { signal, limit = 5 }: { signal?: AbortSignal; limit?: number } = {},
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = new URL(PHOTON_ENDPOINT);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("q", trimmed);

  const response = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Photon respondió ${response.status}`);

  const data = (await response.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();
  return (data.features ?? [])
    .filter((feature) => feature.properties?.countrycode?.toUpperCase() === COUNTRY_CODE)
    .map((feature, i) => toSuggestion(feature, i))
    .filter((suggestion): suggestion is PlaceSuggestion => suggestion !== null)
    .filter((suggestion) => {
      if (seen.has(suggestion.id)) return false;
      seen.add(suggestion.id);
      return true;
    });
}
