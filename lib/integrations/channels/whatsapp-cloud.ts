import { createHmac, timingSafeEqual } from "node:crypto";
import type { ProviderAdapter, ProviderCredentials } from "@/lib/integrations/providers/types";

/**
 * WhatsApp Cloud API (Meta) por negocio (HU-whatsapp-negocio-01, ADR 0010). Cada negocio trae sus credenciales: el identificador de su
 * número, el token de acceso, el secreto de su app (firma del webhook) y un token de verificación. Aquí viven las reglas puras
 * (leer el webhook, firma, ventana de 24 h) y el adaptador de la conexión. Probado contra el formato documentado de Meta, no contra
 * el servicio real (sin credenciales aquí): se verifica con el número de pruebas del negocio.
 */
export const GRAPH = "https://graph.facebook.com/v21.0";
export const WHATSAPP_WINDOW_MS = 24 * 3_600_000;

export type WhatsappCredentials = { phoneNumberId: string; accessToken: string; appSecret: string; verifyToken: string };

/** Teléfono para WhatsApp: solo dígitos, con el indicativo (un móvil colombiano de 10 dígitos gana el 57). `null` si no sirve. */
export function whatsappHandle(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("3")) d = `57${d}`;
  return d.length >= 8 && d.length <= 15 ? d : null;
}

/** Firma `X-Hub-Signature-256` de Meta con el secreto de LA APP DEL NEGOCIO. Sin secreto o sin cabecera, se rechaza. */
export function verifySignature(raw: string, header: string | null, appSecret: string): boolean {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(raw).digest("hex"));
  const got = Buffer.from(header.slice(7));
  return expected.length === got.length && timingSafeEqual(expected, got);
}

/** Firma de un cuerpo (para las pruebas y para simular a Meta). */
export const signBody = (raw: string, appSecret: string) => `sha256=${createHmac("sha256", appSecret).update(raw).digest("hex")}`;

export type InboundMessage = { phoneNumberId: string; handle: string; name: string | null; body: string; externalId: string; at: number };
export type StatusUpdate = { phoneNumberId: string; externalId: string; status: "SENT" | "DELIVERED" | "READ" | "FAILED"; error: string | null };

type Change = { value?: { metadata?: { phone_number_id?: string }; contacts?: { wa_id?: string; profile?: { name?: string } }[]; messages?: Record<string, unknown>[]; statuses?: { id?: string; status?: string; errors?: { title?: string; message?: string }[] }[] } };

/** Mensajes entrantes y avisos de estado de un webhook de Meta, cada uno con el `phone_number_id` al que llegó. */
export function parseWebhook(payload: unknown): { messages: InboundMessage[]; statuses: StatusUpdate[] } {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];
  for (const entry of (payload as { entry?: { changes?: Change[] }[] })?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      const phoneNumberId = String(v?.metadata?.phone_number_id ?? "");
      if (!v || !phoneNumberId) continue;
      for (const m of v.messages ?? []) {
        const from = String(m.from ?? "");
        const handle = whatsappHandle(from);
        const id = String(m.id ?? "");
        if (!handle || !id) continue;
        const type = String(m.type ?? "");
        const body = type === "text" ? String((m.text as { body?: string })?.body ?? "") : type === "button" ? String((m.button as { text?: string })?.text ?? "") : type === "interactive" ? String(((m.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } })?.button_reply ?? (m.interactive as { list_reply?: { title?: string } })?.list_reply)?.title ?? "") : `[${type || "mensaje"} recibido — ábrelo en WhatsApp]`;
        messages.push({ phoneNumberId, handle, name: v.contacts?.find((c) => c.wa_id === from)?.profile?.name ?? null, body: body.slice(0, 4000), externalId: id, at: Number(m.timestamp ?? 0) * 1000 || Date.now() });
      }
      for (const s of v.statuses ?? []) {
        const map: Record<string, StatusUpdate["status"]> = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" };
        const status = map[String(s.status)];
        if (s.id && status) statuses.push({ phoneNumberId, externalId: s.id, status, error: status === "FAILED" ? (s.errors?.[0]?.message ?? s.errors?.[0]?.title ?? "No se pudo entregar") : null });
      }
    }
  }
  return { messages, statuses };
}

/** Ventana de 24 h: texto libre solo dentro de las 24 h desde el último mensaje del contacto. */
export function messagingWindow(lastInboundMs: number | null, now: number): { open: boolean; leftMs: number } {
  if (lastInboundMs == null) return { open: false, leftMs: 0 };
  const left = lastInboundMs + WHATSAPP_WINDOW_MS - now;
  return { open: left > 0, leftMs: Math.max(0, left) };
}

/** Enlace de WhatsApp con el mensaje ya escrito: el respaldo cuando no se puede enviar por la API. */
export const manualLink = (handle: string, text: string) => `https://wa.me/${handle}?text=${encodeURIComponent(text)}`;

export type SendResult = { delivery: "sent"; externalId: string | null } | { delivery: "failed"; error: string };

/** Envía un texto por el número del negocio. No decide la ventana: eso es de quien llama. */
export async function sendText(credentials: Pick<WhatsappCredentials, "phoneNumberId" | "accessToken">, to: string, body: string): Promise<SendResult> {
  try {
    const r = await fetch(`${GRAPH}/${encodeURIComponent(credentials.phoneNumberId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${credentials.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
      signal: AbortSignal.timeout(10_000),
    });
    const j = (await r.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    return r.ok ? { delivery: "sent", externalId: j.messages?.[0]?.id ?? null } : { delivery: "failed", error: j.error?.message ?? `HTTP ${r.status}` };
  } catch (e) {
    return { delivery: "failed", error: (e as Error).message };
  }
}

/** Adaptador de la conexión: comprueba con Meta que el token sirve para ese número. El webhook de mensajes lo atiende `webhook-handler.ts`. */
export const whatsappCloud: ProviderAdapter = {
  provider: "whatsapp_cloud",
  kind: "MESSAGING",
  label: "WhatsApp Business",
  requiredCredentials: ["phoneNumberId", "accessToken", "appSecret", "verifyToken"],
  verifyWebhook: (rawBody, headers, credentials: ProviderCredentials) => verifySignature(rawBody, headers.get("x-hub-signature-256"), credentials.appSecret ?? ""),
  parseWebhook: () => null,
  async check(credentials) {
    if (!credentials.phoneNumberId || !credentials.accessToken) return { ok: false, message: "Faltan el identificador del número y el token de acceso." };
    try {
      const r = await fetch(`${GRAPH}/${encodeURIComponent(credentials.phoneNumberId)}?fields=display_phone_number,verified_name`, { headers: { Authorization: `Bearer ${credentials.accessToken}` }, signal: AbortSignal.timeout(8000) });
      return r.ok ? { ok: true } : { ok: false, message: r.status === 401 || r.status === 403 ? "Meta rechazó el token de acceso." : "Meta no reconoce ese identificador de número." };
    } catch {
      return { ok: false, message: "No se pudo contactar a Meta. Inténtalo de nuevo." };
    }
  },
};
