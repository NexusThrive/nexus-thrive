import { ingestInbound } from "@/lib/ops/inbox";
import { verifyInboundEmailSecret } from "@/lib/ops/inbox-providers";

/**
 * Correo entrante para la bandeja de NEXUS. Lo llama el servicio de correo
 * (reenvío/inbound de Resend, Postmark, Cloudflare Email Workers…) con la
 * cabecera x-inbox-secret = INBOUND_EMAIL_SECRET y un JSON:
 * { from, fromName?, subject?, text, messageId? }.
 */
export async function POST(request: Request) {
  if (!process.env.INBOUND_EMAIL_SECRET) return new Response("Correo entrante no configurado.", { status: 503 });
  if (!verifyInboundEmailSecret(request.headers.get("x-inbox-secret"))) return new Response("No autorizado.", { status: 401 });
  const body = (await request.json().catch(() => null)) as { from?: string; fromName?: string; subject?: string; text?: string; messageId?: string } | null;
  if (!body?.from || !body.text) return new Response("Faltan from y text.", { status: 400 });
  const id = await ingestInbound({
    channel: "EMAIL",
    handle: body.from,
    name: body.fromName ?? null,
    subject: body.subject?.slice(0, 200) ?? null,
    body: body.text.slice(0, 8000),
    externalId: body.messageId ? `email:${body.messageId}`.slice(0, 300) : null,
  });
  return Response.json({ ok: true, conversationId: id });
}
