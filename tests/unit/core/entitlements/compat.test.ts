import { describe, expect, it } from "vitest";
import { checkModuleToggle, moduleStatusRow } from "@/lib/core/entitlements/compat";
import { defaultPricingConfig } from "@/lib/core/entitlements/pricing";

const c = defaultPricingConfig();

describe("compatibilidad de módulos", () => {
  it("el Inicio no se apaga", () => {
    expect(checkModuleToggle(c, "gym", "dashboard", false).ok).toBe(false);
  });
  it("el rubro no limita: cualquier negocio puede encender cualquier función operativa; lo planeado no", () => {
    expect(checkModuleToggle(c, "gym", "construction", true).ok).toBe(false); // obras no es de Gym (ADR 0007)
    expect(checkModuleToggle(c, "gym", "construction", true, null, { allowIncompatible: true }).ok).toBe(true); // el Operations Center lo puede autorizar
    expect(checkModuleToggle(c, "construction", "memberships", true).ok).toBe(true); // Business admite membresías (clubes, academias)
    expect(checkModuleToggle(c, "construction", "quotes", true).ok).toBe(true); // cotización comercial compartida (HU-cotizacion-01)
    expect(checkModuleToggle(c, "restaurant", "orders", true).ok).toBe(false); // planeado
  });
  it("siempre deja desactivar (salvo el Inicio)", () => {
    expect(checkModuleToggle(c, "gym", "construction", false).ok).toBe(true);
  });
  it("todo está incluido en todos los planes: el plan del negocio no recorta funciones", () => {
    const plan = ["dashboard", "crm"];
    expect(checkModuleToggle(c, "gym", "memberships", true, plan).ok).toBe(true);
    expect(checkModuleToggle(c, "gym", "purchases", true, plan).ok).toBe(true);
    expect(checkModuleToggle(c, "gym", "memberships", true, null).ok).toBe(true);
    expect(checkModuleToggle(c, "gym", "memberships", false, plan).ok).toBe(true);
  });
  it("estado contratado / habilitado / operativo", () => {
    const r = moduleStatusRow(c, "gym", "whatsapp", ["dashboard", "crm"], true);
    expect(r).toMatchObject({ contracted: true, enabled: true, state: "operational", compatible: true });
  });
});
