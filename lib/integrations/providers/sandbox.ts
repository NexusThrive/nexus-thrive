import { createHmac, timingSafeEqual } from "node:crypto";
import type { ProviderAdapter } from "./types";

/**
 * Proveedor de pagos de PRUEBA (sin dinero real): sirve para desarrollar,
 * para n8n y para probar el flujo completo antes de contratar Wompi.
 * Firma: cabecera `x-sandbox-signature: sha256=<hex>` con
 * `HMAC-SHA256(webhookSecret, cuerpo)`.
 */
export const sandboxSignature = (webhookSecret: string, body: string) => `sha256=${createHmac("sha256", webhookSecret).update(body).digest("hex")}`;

export const sandboxPayments: ProviderAdapter = {
  provider: "sandbox",
  kind: "PAYMENT",
  label: "Pasarela de prueba",
  requiredCredentials: ["webhookSecret"],
  verifyWebhook(rawBody, headers, credentials) {
    const given = headers.get("x-sandbox-signature") ?? "";
    const expected = sandboxSignature(credentials.webhookSecret ?? "", rawBody);
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  },
  parseWebhook(rawBody) {
    try {
      const body = JSON.parse(rawBody) as { id?: unknown; type?: unknown; reference?: unknown; amount?: unknown };
      if (typeof body.id !== "string" || !body.id || typeof body.type !== "string" || !/^payment\.[a-z_]+$/.test(body.type)) return null;
      return { externalId: body.id.slice(0, 120), type: body.type, reference: typeof body.reference === "string" ? body.reference.slice(0, 120) : null, amount: typeof body.amount === "string" || typeof body.amount === "number" ? String(body.amount) : null };
    } catch {
      return null;
    }
  },
  async check(credentials) {
    return credentials.webhookSecret ? { ok: true } : { ok: false, message: "Falta el secreto del webhook." };
  },
};
