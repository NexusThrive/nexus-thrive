import { describe, expect, it } from "vitest";
import { checkModuleToggle, moduleStatusRow } from "./compat";
import { defaultPricingConfig } from "./pricing";

const c = defaultPricingConfig();

describe("compatibilidad de módulos", () => {
  it("el Inicio no se apaga", () => {
    expect(checkModuleToggle(c, "gym", "dashboard", false).ok).toBe(false);
  });
  it("no activa módulos ajenos al rubro ni planeados", () => {
    expect(checkModuleToggle(c, "gym", "construction", true).ok).toBe(false); // APU en gimnasio
    expect(checkModuleToggle(c, "construction", "quotes", true).ok).toBe(false); // cotización genérica: planeada
    expect(checkModuleToggle(c, "restaurant", "orders", true).ok).toBe(false); // planeado
    expect(checkModuleToggle(c, "construction", "construction", true).ok).toBe(true);
  });
  it("siempre deja desactivar (salvo el Inicio)", () => {
    expect(checkModuleToggle(c, "gym", "construction", false).ok).toBe(true);
  });
  // SEC-06: desde los Ajustes del negocio solo se activa lo del plan.
  it("no activa un módulo que el plan no incluye", () => {
    const plan = ["dashboard", "crm"];
    expect(checkModuleToggle(c, "gym", "memberships", true, plan)).toMatchObject({ ok: false });
    expect(checkModuleToggle(c, "gym", "crm", true, plan).ok).toBe(true);
    expect(checkModuleToggle(c, "gym", "memberships", false, plan).ok).toBe(true); // apagar siempre se puede
  });
  it("sin plan registrado (null) no limita", () => {
    expect(checkModuleToggle(c, "gym", "memberships", true, null).ok).toBe(true);
    expect(checkModuleToggle(c, "gym", "memberships", true).ok).toBe(true);
  });
  it("estado contratado / habilitado / operativo", () => {
    const r = moduleStatusRow(c, "gym", "whatsapp", ["dashboard", "crm"], true);
    expect(r).toMatchObject({ contracted: false, enabled: true, state: "operational", compatible: true });
  });
});
