import { ingestInbound } from "@/lib/ops/inbox";
import { verifyMetaSignature } from "@/lib/ops/inbox-providers";
import { parseWhatsappWebhook } from "@/lib/ops/inbox-rules";

/**
 * Webhook de WhatsApp Cloud API (Meta) para la bandeja de NEXUS.
 * GET: verificación (hub.verify_token = WHATSAPP_VERIFY_TOKEN).
 * POST: mensajes entrantes, solo con firma X-Hub-Signature-256 válida.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === token) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  if (!process.env.WHATSAPP_APP_SECRET) return new Response("WhatsApp no está configurado.", { status: 503 });
  const raw = await request.text();
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"))) return new Response("Firma inválida.", { status: 401 });
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }
  for (const m of parseWhatsappWebhook(payload)) {
    await ingestInbound({ channel: "WHATSAPP", handle: m.handle, name: m.name, body: m.body, externalId: m.externalId, at: m.at });
  }
  // Meta reintenta si no recibe 200: se responde siempre que la firma sea válida.
  return Response.json({ ok: true });
}
