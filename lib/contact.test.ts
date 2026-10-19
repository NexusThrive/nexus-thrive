import { describe, expect, it } from "vitest";
import { accessRequestMessage, whatsappLink } from "@/lib/contact";

describe("contacto de NEXUS", () => {
  it("el enlace de WhatsApp lleva el número y el mensaje", () => {
    const link = whatsappLink("hola");
    expect(link).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(link).toContain(encodeURIComponent("hola"));
  });

  it("el mensaje de acceso pide el plan y los datos del negocio", () => {
    const message = accessRequestMessage({
      planName: "Elite",
      businessName: "Donde Ana",
      city: "Turbaco",
    });
    expect(message).toMatch(/activar NEXUS THRIVE \(plan Elite\)/);
    expect(message).toMatch(/Donde Ana/);
    expect(message).toMatch(/Turbaco/);
    expect(message).toMatch(/pago/i);
  });

  it("omite los datos que no están", () => {
    const message = accessRequestMessage({ planName: "Signature" });
    expect(message).toMatch(/plan Signature/);
    expect(message).not.toMatch(/Mi negocio:/);
    expect(message).not.toMatch(/Ciudad:/);
  });
});
