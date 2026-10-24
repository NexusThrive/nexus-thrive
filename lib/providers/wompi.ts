import { createHash, timingSafeEqual } from "node:crypto";
import type { ProviderAdapter, ProviderCredentials } from "./types";

/**
 * Adaptador de pagos Wompi. Cumple el mismo puerto que la pasarela de prueba: NEXUS no sabe
 * qué pasarela es, solo recibe eventos normalizados. Credenciales por negocio: llave pública,
 * secreto de integridad (firma del checkout) y secreto de eventos (firma del webhook).
 *
 * Firma del webhook (según la documentación de Wompi): SHA-256 de la concatenación de los valores
 * de `signature.properties` tomados de `data`, luego `timestamp` y por último el secreto de eventos;
 * se compara con `signature.checksum`. Firma del checkout: SHA-256 de `referencia + centavos + moneda + secreto de integridad`.
 *
 * Nota: probado contra el algoritmo documentado, no contra el sandbox real de Wompi (sin credenciales aquí).
 */
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

type WompiEvent = {
  event?: string;
  data?: { transaction?: { id?: string; status?: string; amount_in_cents?: number; reference?: string; currency?: string } } & Record<string, unknown>;
  timestamp?: number;
  signature?: { properties?: string[]; checksum?: string };
};

const pick = (data: unknown, path: string): string => {
  let cur: unknown = data;
  for (const part of path.split(".")) cur = (cur as Record<string, unknown> | undefined)?.[part];
  return cur === undefined || cur === null ? "" : String(cur);
};

/** Checksum que Wompi firma para un evento (lo usan la verificación y las pruebas). */
export function wompiChecksum(body: WompiEvent, eventsSecret: string): string {
  const values = (body.signature?.properties ?? []).map((p) => pick(body.data, p)).join("");
  return sha256(`${values}${body.timestamp ?? ""}${eventsSecret}`);
}

/** Firma de integridad que exige el checkout alojado. */
export const wompiIntegrity = (reference: string, amountInCents: number, currency: string, integritySecret: string) => sha256(`${reference}${amountInCents}${currency}${integritySecret}`);

/** Enlace del checkout alojado de Wompi para pagar un cobro nuestro. */
export function wompiCheckoutUrl(input: { publicKey: string; integritySecret: string; reference: string; amount: number; redirectUrl?: string }): string {
  const cents = Math.round(input.amount * 100);
  const q = new URLSearchParams({ "public-key": input.publicKey, currency: "COP", "amount-in-cents": String(cents), reference: input.reference, "signature:integrity": wompiIntegrity(input.reference, cents, "COP", input.integritySecret) });
  if (input.redirectUrl) q.set("redirect-url", input.redirectUrl);
  return `https://checkout.wompi.co/p/?${q.toString()}`;
}

const MAP: Record<string, string> = { APPROVED: "payment.succeeded", DECLINED: "payment.failed", ERROR: "payment.failed", VOIDED: "payment.voided" };

export const wompiPayments: ProviderAdapter = {
  provider: "wompi",
  kind: "PAYMENT",
  label: "Wompi",
  requiredCredentials: ["publicKey", "integritySecret", "eventsSecret"],
  verifyWebhook(rawBody, _headers, credentials: ProviderCredentials) {
    try {
      const body = JSON.parse(rawBody) as WompiEvent;
      const given = body.signature?.checksum ?? "";
      const expected = wompiChecksum(body, credentials.eventsSecret ?? "");
      const a = Buffer.from(given.toLowerCase());
      const b = Buffer.from(expected);
      return given.length > 0 && a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  },
  parseWebhook(rawBody) {
    try {
      const body = JSON.parse(rawBody) as WompiEvent;
      const tx = body.data?.transaction;
      if (body.event !== "transaction.updated" || !tx?.id || !tx.status) return null;
      const type = MAP[tx.status];
      if (!type) return null; // PENDING y otros: aún no hay estado oficial
      return {
        // Un mismo pago puede notificarse varias veces con estados distintos: el estado entra en el id para no descartarlo como repetido.
        externalId: `${tx.id}:${tx.status}`.slice(0, 120),
        paymentRef: String(tx.id).slice(0, 120),
        type,
        reference: tx.reference ? String(tx.reference).slice(0, 120) : null,
        amount: typeof tx.amount_in_cents === "number" ? String(tx.amount_in_cents / 100) : null,
      };
    } catch {
      return null;
    }
  },
  async check(credentials) {
    if (!credentials.publicKey || !credentials.integritySecret || !credentials.eventsSecret) return { ok: false, message: "Faltan la llave pública y los secretos de integridad y de eventos." };
    const base = credentials.publicKey.startsWith("pub_prod") ? "https://production.wompi.co" : "https://sandbox.wompi.co";
    try {
      const res = await fetch(`${base}/v1/merchants/${encodeURIComponent(credentials.publicKey)}`, { signal: AbortSignal.timeout(8000) });
      return res.ok ? { ok: true } : { ok: false, message: "Wompi no reconoce esa llave pública." };
    } catch {
      return { ok: false, message: "No se pudo contactar a Wompi. Inténtalo de nuevo." };
    }
  },
};
