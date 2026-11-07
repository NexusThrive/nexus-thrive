import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES, decideSend, hasMissingVariables, isOptOut, renderTemplate, validateTemplate, variablesOf } from "@/lib/integrations/channels/notices";

describe("plantillas y avisos de WhatsApp (HU-whatsapp-negocio-02)", () => {
  const base = { optedOut: false, consent: true, connected: true, windowOpen: false, templateStatus: "APPROVED" as const };

  it("dentro de la ventana de 24 h sale texto libre, aunque la plantilla no esté aprobada", () => {
    expect(decideSend({ ...base, windowOpen: true, templateStatus: "NONE" })).toEqual({ action: "send_text" });
  });
  it("fuera de la ventana solo sale con plantilla aprobada; si no, queda listo con un toque", () => {
    expect(decideSend(base)).toEqual({ action: "send_template" });
    for (const status of ["NONE", "PENDING", "REJECTED", null] as const) expect(decideSend({ ...base, templateStatus: status })).toMatchObject({ action: "manual", reason: expect.stringContaining("plantilla aprobada") });
  });
  it("una baja detiene todo, incluso con ventana abierta y plantilla aprobada", () => {
    expect(decideSend({ ...base, optedOut: true, windowOpen: true })).toMatchObject({ action: "block" });
  });
  it("sin consentimiento nunca sale solo", () => {
    expect(decideSend({ ...base, consent: false, windowOpen: true })).toMatchObject({ action: "manual", reason: expect.stringContaining("consentimiento") });
  });
  it("sin conexión queda listo con un toque", () => {
    expect(decideSend({ ...base, connected: false })).toMatchObject({ action: "manual", reason: expect.stringContaining("conectas") });
  });

  it("reconoce una baja solo si el mensaje ES la baja", () => {
    for (const t of ["BAJA", "baja", " Stop ", "no más", "No más.", "darme de baja", "parar"]) expect(isOptOut(t), t).toBe(true);
    for (const t of ["Hola, quiero la baja del precio", "no me interesa", "gracias", "para cuándo está mi pedido", ""]) expect(isOptOut(t), t).toBe(false);
  });

  it("rellena variables y deja a la vista las que faltan", () => {
    expect(variablesOf("Hola {{nombre}}, tu pedido {{codigo}} por {{total}}. {{nombre}}")).toEqual(["nombre", "codigo", "total"]);
    const t = "Hola {{nombre}}, pedido {{codigo}}";
    expect(renderTemplate(t, { nombre: "Camila", codigo: "T-0042" })).toBe("Hola Camila, pedido T-0042");
    const partial = renderTemplate(t, { nombre: "Camila" });
    expect(partial).toBe("Hola Camila, pedido {{codigo}}");
    expect(hasMissingVariables(partial)).toBe(true);
    expect(hasMissingVariables("Hola Camila")).toBe(false);
  });

  it("valida la plantilla: clave, título, texto y hecho", () => {
    const ok = { key: "pedido_listo", title: "Pedido listo", body: "Hola {{nombre}}, tu pedido está listo", event: "order.paid" };
    expect(validateTemplate(ok)).toBeNull();
    expect(validateTemplate({ ...ok, key: "Pedido Listo" })).toContain("minúsculas");
    expect(validateTemplate({ ...ok, title: "ab" })).toContain("título");
    expect(validateTemplate({ ...ok, body: "hola" })).toContain("texto");
    expect(validateTemplate({ ...ok, body: "x".repeat(1001) })).toContain("largo");
    expect(validateTemplate({ ...ok, event: "payment.refunded" })).toContain("hecho");
  });

  it("las plantillas de partida son válidas y de utilidad (sin promoción)", () => {
    for (const t of DEFAULT_TEMPLATES) {
      expect(validateTemplate(t), t.key).toBeNull();
      expect(variablesOf(t.body)).toContain("negocio");
      expect(t.body.toLowerCase()).not.toMatch(/oferta|descuento|promoci/);
    }
  });
});
