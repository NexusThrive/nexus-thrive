import { describe, expect, it } from "vitest";
import { validateAdaptiveOnboarding } from "./validation";

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
