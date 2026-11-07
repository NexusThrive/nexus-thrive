import { timingSafeEqual } from "node:crypto";
import { decryptCredentials } from "@/lib/integrations/providers/connections";
import { db } from "@/prisma/db";
import { applyStatus, ingestInbound } from "./conversations-db";
import { parseWebhook, verifySignature, type WhatsappCredentials } from "./whatsapp-cloud";

/**
 * Webhook de WhatsApp de UN negocio (`/api/webhooks/channels/whatsapp/<connectionId>`, ADR 0010). La conexión fija el negocio: la
 * firma se verifica con el secreto de esa conexión y el `phone_number_id` del cuerpo debe ser el de su número; un mensaje de otro
 * número se rechaza. Meta reintenta si no recibe 200, así que con firma válida se responde 200 aunque algún mensaje se ignore.
 */
type Conn = { id: string; tenantId: string; credentials: WhatsappCredentials };
const ID = /^[0-9a-f-]{36}$/;

async function load(connectionId: string): Promise<Conn | null> {
  if (!ID.test(connectionId)) return null;
  const c = await db.orm.public.ExternalConnection.where({ id: connectionId, kind: "MESSAGING", provider: "whatsapp_cloud", status: "CONNECTED" }).first();
  if (!c?.credentialsEnc) return null;
  try {
    return { id: c.id, tenantId: c.tenantId, credentials: decryptCredentials(c.credentialsEnc) as unknown as WhatsappCredentials };
  } catch {
    return null;
  }
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** GET de Meta para suscribir el webhook: responde el desafío solo si el token de verificación es el de esta conexión. */
export async function verifyWebhookRequest(connectionId: string, params: URLSearchParams): Promise<Response> {
  const conn = await load(connectionId);
  const token = params.get("hub.verify_token") ?? "";
  if (conn && params.get("hub.mode") === "subscribe" && conn.credentials.verifyToken && same(token, conn.credentials.verifyToken)) return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  return new Response("Forbidden", { status: 403 });
}

/** POST de Meta: mensajes entrantes y avisos de estado de ESTE número. */
export async function receiveWebhookRequest(connectionId: string, raw: string, signature: string | null): Promise<Response> {
  const conn = await load(connectionId);
  if (!conn) return new Response("Conexión no encontrada.", { status: 404 });
  if (!verifySignature(raw, signature, conn.credentials.appSecret)) return new Response("Firma inválida.", { status: 401 });
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }
  const { messages, statuses } = parseWebhook(payload);
  let stored = 0;
  for (const m of messages) {
    if (m.phoneNumberId !== conn.credentials.phoneNumberId) continue; // de otro número: no es de este negocio
    if ((await ingestInbound(conn.tenantId, conn.id, m)).stored) stored++;
  }
  for (const s of statuses) if (s.phoneNumberId === conn.credentials.phoneNumberId) await applyStatus(conn.tenantId, s);
  return Response.json({ ok: true, stored });
}
