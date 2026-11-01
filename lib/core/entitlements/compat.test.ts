import { describe, expect, it } from "vitest";
import { checkModuleToggle, moduleStatusRow } from "./compat";
import { defaultPricingConfig } from "./pricing";

const c = defaultPricingConfig();

describe("compatibilidad de módulos", () => {
  it("el Inicio no se apaga", () => {
    expect(checkModuleToggle(c, "gym", "dashboard", false).ok).toBe(false);
  });
  it("el rubro no limita: cualquier negocio puede encender cualquier función operativa; lo planeado no", () => {
    expect(checkModuleToggle(c, "gym", "construction", true).ok).toBe(true); // un gimnasio puede usar obras
    expect(checkModuleToggle(c, "construction", "memberships", true).ok).toBe(true);
    expect(checkModuleToggle(c, "construction", "quotes", true).ok).toBe(false); // cotización genérica: planeada
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
