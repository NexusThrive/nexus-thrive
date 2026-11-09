import { describe, expect, it } from "vitest";
import { validateAdaptiveOnboarding } from "@/lib/core/tenancy/onboarding/validation";

const base = {
  tenantType: "COMPANY",
  name: "Barbería El Caballero",
  taxId: "901234567",
  slug: "barberia-el-caballero",
  vertical: "gym",
  teamSize: "2-5",
  address: "Cra 7 # 72-41",
  city: "Bogotá",
  selectedModules: [],
};

describe("validación de la ubicación en el onboarding", () => {
  it("conserva las coordenadas cuando hay dirección real y están en rango", () => {
    const result = validateAdaptiveOnboarding({
      ...base,
      latitude: 4.6533,
      longitude: -74.0836,
      placeId: "ChIJabc123",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.latitude).toBeCloseTo(4.6533);
    expect(result.values.longitude).toBeCloseTo(-74.0836);
    expect(result.values.placeId).toBe("ChIJabc123");
  });

  it("descarta coordenadas cuando la dirección es REMOTE", () => {
    const result = validateAdaptiveOnboarding({
      ...base,
      address: "remote",
      latitude: 4.65,
      longitude: -74.05,
      placeId: "ChIJ123",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.address).toBe("REMOTE");
    expect(result.values.latitude).toBeUndefined();
    expect(result.values.longitude).toBeUndefined();
    expect(result.values.placeId).toBeUndefined();
  });

  it("descarta coordenadas fuera de rango", () => {
    const result = validateAdaptiveOnboarding({
      ...base,
      latitude: 200,
      longitude: -74.05,
      placeId: "ChIJ123",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.latitude).toBeUndefined();
    expect(result.values.longitude).toBeUndefined();
    expect(result.values.placeId).toBeUndefined();
  });

  it("la ciudad es opcional (se deduce del autocompletado)", () => {
    const result = validateAdaptiveOnboarding({
      ...base,
      city: undefined,
      latitude: 4.6533,
      longitude: -74.0836,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.city).toBeUndefined();
    expect(result.values.latitude).toBeCloseTo(4.6533);
  });

  it("acepta coordenadas para un perfil individual con dirección", () => {
    const result = validateAdaptiveOnboarding({
      tenantType: "INDIVIDUAL",
      name: "Barbería El Caballero",
      slug: "barberia-el-caballero",
      vertical: "gym",
      teamSize: "SOLO",
      address: "Cra 7 # 72-41",
      latitude: 4.6533,
      longitude: -74.0836,
      placeId: "ChIJabc123",
      city: "Bogotá",
      selectedModules: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.latitude).toBeCloseTo(4.6533);
    expect(result.values.placeId).toBe("ChIJabc123");
  });
});

describe("etapa del negocio: sin exigir papeles", () => {
  const minimal = { name: "Mi tienda", slug: "mi-tienda", vertical: "retail", teamSize: "SOLO", selectedModules: [] };
  it("emprendiendo y en funcionamiento piden solo nombre, enlace, rubro y equipo (NIT, razón social y dirección son opcionales)", () => {
    for (const tenantType of ["INDIVIDUAL", "COMPANY"]) {
      const r = validateAdaptiveOnboarding({ ...minimal, tenantType });
      expect(r.ok, tenantType).toBe(true);
    }
  });
  it("el tamaño del equipo se pide a todos", () => {
    const r = validateAdaptiveOnboarding({ ...minimal, tenantType: "INDIVIDUAL", teamSize: undefined });
    expect(r).toMatchObject({ ok: false, errors: { teamSize: expect.stringContaining("equipo") } });
  });
  it("un NIT escrito sí debe ser válido", () => {
    expect(validateAdaptiveOnboarding({ ...minimal, tenantType: "COMPANY", taxId: "abc" })).toMatchObject({ ok: false, errors: { taxId: expect.any(String) } });
  });
  it("lo que cuenta de su operación prepara capacidades y se guarda limpio", () => {
    const r = validateAdaptiveOnboarding({ ...minimal, tenantType: "INDIVIDUAL", operation: { offers: ["PRODUCTS"], channels: ["COUNTER", "ZZZ"], controls: ["INVENTORY"], tools: ["NOTEBOOK"] } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.operation).toEqual({ offers: ["PRODUCTS"], channels: ["COUNTER"], controls: ["INVENTORY"], tools: ["NOTEBOOK"] });
    expect(r.values.selectedModules).toContain("pos");
    expect(r.values.selectedModules).toContain("inventory");
  });
});
