import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPlaces, toSuggestion } from "./photon";

const feature = (
  overrides: Partial<{
    coutrycode: string;
    countrycode: string;
    osmId: number;
    osmType: string;
    name: string;
    street: string;
    housenumber: string;
    city: string;
    coordinates: [number, number];
  }> = {},
) => ({
  geometry: {
    type: "Point" as const,
    coordinates: overrides.coordinates ?? ([-74.0836, 4.6533] as [number, number]),
  },
  properties: {
    osm_type: overrides.osmType ?? "W",
    osm_id: overrides.osmId ?? 123,
    name: overrides.name,
    street: overrides.street,
    housenumber: overrides.housenumber,
    city: overrides.city,
    state: "Bogotá, D.C.",
    country: "Colombia",
    countrycode: overrides.countrycode ?? "CO",
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("toSuggestion", () => {
  it("arma etiqueta, dirección y coordenadas desde una feature de Photon", () => {
    const suggestion = toSuggestion(feature({ street: "Avenida Carrera 7", housenumber: "72-41", city: "Bogotá" }), 0);
    expect(suggestion?.primary).toBe("Avenida Carrera 7 72-41");
    expect(suggestion?.city).toBe("Bogotá");
    expect(suggestion?.latitude).toBeCloseTo(4.6533);
    expect(suggestion?.longitude).toBeCloseTo(-74.0836);
    expect(suggestion?.address).toContain("Bogotá");
  });

  it("devuelve null cuando no hay coordenadas utilizables", () => {
    const invalid = { geometry: { type: "Point" as const, coordinates: [] as number[] }, properties: {} };
    expect(toSuggestion(invalid, 0)).toBeNull();
  });
});

describe("searchPlaces", () => {
  it("no consulta con menos de 3 caracteres", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchPlaces("ab")).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("filtra a Colombia y elimina ids duplicados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          features: [
            feature({ osmId: 999, city: "Bogotá" }),
            feature({ osmId: 123, name: "Duplicado", city: "Bogotá" }),
            feature({ osmId: 123, name: "Duplicado", city: "Bogotá" }),
            feature({ osmId: 999, countrycode: "US", city: "Miami" }),
          ],
        }),
      })) as unknown as typeof fetch,
    );

    const results = await searchPlaces("Cra 7 Bogotá");
    // Descarta la de EE. UU. y deduplica el nodo repetido.
    expect(results.map((s) => s.id)).toEqual(["W999", "W123"]);
  });

  it("lanza si Photon responde con error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch);
    await expect(searchPlaces("Cra 7 Bogotá")).rejects.toThrow(/503/);
  });
});
