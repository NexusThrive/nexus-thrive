import { describe, expect, it } from "vitest";
import { EMPTY_OPERATION, hasOperation, operationSummary, recommendedModules, sanitizeOperation } from "@/lib/core/tenancy/onboarding/operation";

describe("tu operación (onboarding)", () => {
  it("sin respuestas solo deja el Inicio", () => {
    expect(recommendedModules(EMPTY_OPERATION)).toEqual(["dashboard"]);
    expect(hasOperation(EMPTY_OPERATION)).toBe(false);
  });
  it("un comercio de mostrador con fiado y WhatsApp recibe lo que necesita", () => {
    const mods = recommendedModules({ offers: ["PRODUCTS"], channels: ["COUNTER", "WHATSAPP", "ORDERS"], controls: ["INVENTORY", "RECEIVABLES", "INCOME_EXPENSES"], tools: ["NOTEBOOK"] });
    for (const m of ["dashboard", "crm", "finance", "pos", "whatsapp", "orders", "inventory", "receivables"]) expect(mods).toContain(m);
    expect(mods).not.toContain("quotes");
  });
  it("vender productos prepara inventario aunque no lo marque; cotizar prepara cotizaciones", () => {
    expect(recommendedModules({ offers: ["PRODUCTS"], channels: [], controls: [], tools: [] })).toContain("inventory");
    expect(recommendedModules({ offers: ["SERVICES"], channels: ["QUOTES"], controls: ["INVOICING"], tools: [] })).toEqual(expect.arrayContaining(["quotes", "billing"]));
  });
  it("limpia lo que llega del navegador: solo valores conocidos y sin repetir", () => {
    expect(sanitizeOperation({ offers: ["PRODUCTS", "PRODUCTS", "X"], channels: "no", controls: ["INVENTORY", 3], tools: ["NONE"], extra: 1 })).toEqual({ offers: ["PRODUCTS"], channels: [], controls: ["INVENTORY"], tools: ["NONE"] });
    expect(sanitizeOperation(null)).toEqual(EMPTY_OPERATION);
  });
  it("resume en una frase", () => {
    expect(operationSummary({ offers: ["PRODUCTS", "SERVICES"], channels: ["COUNTER"], controls: [], tools: [] })).toBe("Productos y Servicios · Vendo en mostrador");
  });
});
