import { describe, expect, it } from "vitest";
import { normalizeHandle, parseWhatsappWebhook, samePhone, whatsappWindow } from "./inbox-rules";

describe("bandeja", () => {
  it("normaliza teléfonos y correos", () => {
    expect(normalizeHandle("WHATSAPP", "+57 300 123 4567")).toBe("573001234567");
    expect(normalizeHandle("WHATSAPP", "3001234567")).toBe("573001234567");
    expect(normalizeHandle("WHATSAPP", "12")).toBeNull();
    expect(normalizeHandle("EMAIL", "Juan <JUAN@Gym.co>")).toBe("juan@gym.co");
    expect(samePhone("+57 300 123 4567", "3001234567")).toBe(true);
  });
  it("ventana de 24 h de WhatsApp", () => {
    const now = Date.UTC(2026, 9, 17, 12);
    expect(whatsappWindow(now - 3_600_000, now).open).toBe(true);
    expect(whatsappWindow(now - 25 * 3_600_000, now).open).toBe(false);
    expect(whatsappWindow(null, now).open).toBe(false);
  });
  it("lee el webhook de WhatsApp Cloud API", () => {
    const payload = {
      entry: [{ changes: [{ value: {
        contacts: [{ wa_id: "573001234567", profile: { name: "Laura" } }],
        messages: [
          { from: "573001234567", id: "wamid.1", timestamp: "1792000000", type: "text", text: { body: "Hola, no puedo entrar" } },
          { from: "573001234567", id: "wamid.2", timestamp: "1792000001", type: "image", image: {} },
        ],
      } }] }],
    };
    const r = parseWhatsappWebhook(payload);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ handle: "573001234567", name: "Laura", body: "Hola, no puedo entrar", externalId: "wamid.1" });
    expect(r[1].body).toContain("image");
    expect(parseWhatsappWebhook({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
  });
});
