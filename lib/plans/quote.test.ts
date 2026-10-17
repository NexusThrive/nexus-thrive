import { describe, expect, it } from "vitest";
import { sortModules } from "@/lib/admin-catalogs";
import { formatUsdCents, modulesForVertical, quotePlan, resolvePlanModules } from "./quote";

describe("modulesForVertical", () => {
  it("una constructora no ve Membresías ni Reservas; un gimnasio sí ve Membresías", () => {
    const construction = modulesForVertical("construction");
    expect(construction).toContain("quotes");
    expect(construction).not.toContain("memberships");
    expect(construction).not.toContain("bookings");
    expect(modulesForVertical("gym")).toContain("memberships");
  });
});

describe("resolvePlanModules", () => {
  it("Essential: solo los incluidos", () => {
    expect(resolvePlanModules("ESSENTIAL", "gym", ["whatsapp"])).toEqual(sortModules(["dashboard", "crm", "finance"]));
  });
  it("Elite descarta módulos ajenos al rubro", () => {
    expect(resolvePlanModules("ELITE", "construction", ["quotes", "memberships"])).toContain("quotes");
    expect(resolvePlanModules("ELITE", "construction", ["quotes", "memberships"])).not.toContain("memberships");
  });
  it("Signature activa todos los del rubro", () => {
    expect(resolvePlanModules("SIGNATURE", "gym", [])).toEqual(modulesForVertical("gym"));
  });
});

describe("quotePlan", () => {
  it("Essential es gratis", () => {
    const q = quotePlan({ plan: "ESSENTIAL", vertical: "gym", billing: "MONTHLY", selected: [] });
    expect(q.monthlyCents).toBe(0);
  });
  it("Elite suma base y módulos con el factor del rubro", () => {
    // gym (×1): 29 + WhatsApp 9 + Membresías 8 = 46
    const q = quotePlan({ plan: "ELITE", vertical: "gym", billing: "MONTHLY", selected: ["whatsapp", "memberships"] });
    expect(q.monthlyCents).toBe(4600);
  });
  it("construcción aplica ×1,35 a la base y a cada módulo", () => {
    // base round(29×1.35)=39; APU round(14×1.35)=19
    const q = quotePlan({ plan: "ELITE", vertical: "construction", billing: "MONTHLY", selected: ["quotes"] });
    expect(q.monthlyCents).toBe(5800);
  });
  it("anual descuenta 20 %", () => {
    const m = quotePlan({ plan: "ELITE", vertical: "gym", billing: "MONTHLY", selected: ["whatsapp"] });
    const a = quotePlan({ plan: "ELITE", vertical: "gym", billing: "ANNUAL", selected: ["whatsapp"] });
    expect(a.monthlyCents).toBe(Math.round(m.monthlyCents * 0.8));
    expect(a.yearlyCents).toBe(a.monthlyCents * 12);
  });
  it("Signature cobra los módulos al 60 %", () => {
    const q = quotePlan({ plan: "SIGNATURE", vertical: "gym", billing: "MONTHLY", selected: [] });
    const wa = q.lines.find((l) => l.module === "whatsapp");
    expect(wa?.cents).toBe(540);
  });
});

describe("formatUsdCents", () => {
  it("formatea en USD", () => {
    expect(formatUsdCents(2900)).toBe("$29");
    expect(formatUsdCents(8440)).toBe("$84.40");
  });
});
