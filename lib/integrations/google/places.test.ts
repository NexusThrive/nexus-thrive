import { describe, expect, it, vi } from "vitest";
import { PlacesError, fetchPlace, napCheck, similar } from "./places";

const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const ID = "ChIJN1t_tDeuEmsRUsoyG83frY4";

describe("Google Places", () => {
  it("lee el lugar con llave y máscara de campos y lo normaliza", async () => {
    const spy = vi.fn(reply(200, { displayName: { text: "Simplapp Gym" }, formattedAddress: "Cl. 80 #12-34, Bogotá", internationalPhoneNumber: "+57 300 123 4567", websiteUri: "https://www.simplapp.co/", rating: 4.6, userRatingCount: 128 }));
    expect(await fetchPlace(ID, "KEY", spy)).toEqual({ name: "Simplapp Gym", address: "Cl. 80 #12-34, Bogotá", phone: "+57 300 123 4567", website: "https://www.simplapp.co/", rating: 4.6, ratingCount: 128 });
    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toContain(`/v1/places/${ID}`);
    expect((init as RequestInit).headers).toMatchObject({ "X-Goog-Api-Key": "KEY", "X-Goog-FieldMask": expect.stringContaining("rating") });
  });
  it("traduce los errores a mensajes accionables y marca los que se reintentan", async () => {
    await expect(fetchPlace("malo", "K")).rejects.toThrow(/ChIJ/);
    await expect(fetchPlace(ID, "K", reply(404, {}))).rejects.toThrow(/no encontró/);
    await expect(fetchPlace(ID, "K", reply(403, {}))).rejects.toThrow(/Places API \(New\)/);
    const e = await fetchPlace(ID, "K", reply(503, {})).catch((x) => x);
    expect(e).toBeInstanceOf(PlacesError);
    expect(e.retryable).toBe(true);
    const net = await fetchPlace(ID, "K", (async () => { throw new Error("x"); }) as unknown as typeof fetch).catch((x) => x);
    expect(net.retryable).toBe(true);
  });
  it("compara sin tildes ni signos y por palabras", () => {
    expect(similar("Cra. 15 # 80-34, Bogotá", "Carrera 15 80 34 Bogotá")).toBe(true); // la abreviatura no tumba la coincidencia
    expect(similar("Cra. 15 # 80-34, Bogotá", "Calle 5 # 1-2, Cali")).toBe(false);
    expect(similar("Calle 80 # 12-34 Bogotá", "Cl. 80 #12-34, Bogotá, Colombia")).toBe(true);
    expect(similar("Simplapp Gym", "SIMPLAPP GYM ")).toBe(true);
    expect(similar(null, "x")).toBe(false);
  });
  it("nombre, dirección, teléfono y sitio: coinciden o se marcan", () => {
    const google = { name: "Simplapp Gym", address: "Calle 80 #12-34, Bogotá, Colombia", phone: "+57 300 123 4567", website: "https://www.simplapp.co/", rating: 4.6, ratingCount: 128 };
    expect(napCheck({ name: "Simplapp Gym", address: "Calle 80 # 12-34 Bogotá", phone: "3001234567", website: "https://simplapp.co" }, google).every((r) => r.match)).toBe(true);
    const bad = napCheck({ name: "Otro", address: "Carrera 7 1-1 Cali", phone: "3999999999", website: "https://otro.co" }, google);
    expect(bad.map((r) => r.match)).toEqual([false, false, false, false]);
    // Lo que NEXUS no tiene no es un error de coherencia.
    expect(napCheck({ name: "Simplapp Gym", address: null, phone: null, website: null }, google).filter((r) => !r.match)).toEqual([]);
  });
});
