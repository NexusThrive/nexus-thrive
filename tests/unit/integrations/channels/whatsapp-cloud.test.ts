import { describe, expect, it } from "vitest";
import { manualLink, messagingWindow, parseWebhook, signBody, verifySignature, whatsappCloud, whatsappHandle } from "@/lib/integrations/channels/whatsapp-cloud";

const payload = (extra: Record<string, unknown> = {}) => ({
  entry: [{ changes: [{ value: { metadata: { phone_number_id: "109876543210" }, contacts: [{ wa_id: "573001112233", profile: { name: "Camila" } }], messages: [{ from: "573001112233", id: "wamid.AAA", timestamp: "1762500000", type: "text", text: { body: "Hola, quiero 40 camisetas" } }], ...extra } }] }],
});

describe("WhatsApp Business por negocio (HU-whatsapp-negocio-01)", () => {
  it("lee un mensaje de texto con el número al que llegó", () => {
    const { messages, statuses } = parseWebhook(payload());
    expect(statuses).toEqual([]);
    expect(messages).toEqual([{ phoneNumberId: "109876543210", handle: "573001112233", name: "Camila", body: "Hola, quiero 40 camisetas", externalId: "wamid.AAA", at: 1762500000000 }]);
  });
  it("lee botones, listas y archivos sin romperse", () => {
    const msgs = (m: Record<string, unknown>[]) => parseWebhook(payload({ messages: m })).messages.map((x) => x.body);
    expect(msgs([{ from: "573001112233", id: "1", type: "button", button: { text: "Sí, confirmo" } }])).toEqual(["Sí, confirmo"]);
    expect(msgs([{ from: "573001112233", id: "2", type: "interactive", interactive: { list_reply: { title: "Opción B" } } }])).toEqual(["Opción B"]);
    expect(msgs([{ from: "573001112233", id: "3", type: "image" }])).toEqual(["[image recibido — ábrelo en WhatsApp]"]);
    expect(msgs([{ from: "", id: "4", type: "text" }, { from: "573001112233", type: "text" }])).toEqual([]);
  });
  it("lee los avisos de estado y el motivo de un fallo", () => {
    const { statuses } = parseWebhook(payload({ messages: undefined, statuses: [{ id: "wamid.OUT", status: "delivered" }, { id: "wamid.BAD", status: "failed", errors: [{ message: "Fuera de la ventana" }] }, { id: "x", status: "otro" }] }));
    expect(statuses).toEqual([{ phoneNumberId: "109876543210", externalId: "wamid.OUT", status: "DELIVERED", error: null }, { phoneNumberId: "109876543210", externalId: "wamid.BAD", status: "FAILED", error: "Fuera de la ventana" }]);
  });
  it("un cuerpo raro no produce nada", () => {
    for (const bad of [null, {}, { entry: "x" }, { entry: [{ changes: [{ value: {} }] }] }]) expect(parseWebhook(bad)).toEqual({ messages: [], statuses: [] });
  });
  it("la firma se comprueba con el secreto de la app del negocio", () => {
    const raw = JSON.stringify(payload());
    expect(verifySignature(raw, signBody(raw, "secreto-de-la-app"), "secreto-de-la-app")).toBe(true);
    expect(verifySignature(raw, signBody(raw, "otro-secreto"), "secreto-de-la-app")).toBe(false);
    expect(verifySignature(raw + " ", signBody(raw, "secreto-de-la-app"), "secreto-de-la-app")).toBe(false);
    expect(verifySignature(raw, null, "secreto-de-la-app")).toBe(false);
    expect(verifySignature(raw, signBody(raw, ""), "")).toBe(false);
  });
  it("la ventana de 24 h se abre con el mensaje del contacto y se cierra a las 24 h", () => {
    const t = Date.parse("2026-11-07T12:00:00Z");
    expect(messagingWindow(null, t)).toEqual({ open: false, leftMs: 0 });
    expect(messagingWindow(t - 3_600_000, t)).toMatchObject({ open: true, leftMs: 23 * 3_600_000 });
    expect(messagingWindow(t - 24 * 3_600_000, t).open).toBe(false);
  });
  it("el teléfono y el enlace de respaldo", () => {
    expect(whatsappHandle("300 111 2233")).toBe("573001112233");
    expect(whatsappHandle("12")).toBeNull();
    expect(manualLink("573001112233", "Hola ¿qué tal?")).toBe("https://wa.me/573001112233?text=Hola%20%C2%BFqu%C3%A9%20tal%3F");
  });
  it("el adaptador pide las cuatro credenciales y rechaza la firma ajena", () => {
    expect(whatsappCloud.requiredCredentials).toEqual(["phoneNumberId", "accessToken", "appSecret", "verifyToken"]);
    const raw = "{}";
    expect(whatsappCloud.verifyWebhook(raw, new Headers({ "x-hub-signature-256": signBody(raw, "s") }), { appSecret: "s" })).toBe(true);
    expect(whatsappCloud.verifyWebhook(raw, new Headers({ "x-hub-signature-256": signBody(raw, "s") }), { appSecret: "t" })).toBe(false);
  });
});
