import { describe, expect, it } from "vitest";
import { checkModuleToggle, moduleStatusRow } from "./compat";
import { defaultPricingConfig } from "./pricing";

const c = defaultPricingConfig();

describe("compatibilidad de módulos", () => {
  it("el Inicio no se apaga", () => {
    expect(checkModuleToggle(c, "gym", "dashboard", false).ok).toBe(false);
  });
  it("no activa módulos ajenos al rubro ni planeados", () => {
    expect(checkModuleToggle(c, "gym", "quotes", true).ok).toBe(false); // APU en gimnasio
    expect(checkModuleToggle(c, "restaurant", "orders", true).ok).toBe(false); // planeado
    expect(checkModuleToggle(c, "construction", "quotes", true).ok).toBe(true);
  });
  it("siempre deja desactivar (salvo el Inicio)", () => {
    expect(checkModuleToggle(c, "gym", "quotes", false).ok).toBe(true);
  });
  it("estado contratado / habilitado / operativo", () => {
    const r = moduleStatusRow(c, "gym", "whatsapp", ["dashboard", "crm"], true);
    expect(r).toMatchObject({ contracted: false, enabled: true, state: "operational", compatible: true });
  });
});
