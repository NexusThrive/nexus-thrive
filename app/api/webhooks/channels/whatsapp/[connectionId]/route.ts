import { receiveWebhookRequest, verifyWebhookRequest } from "@/lib/integrations/channels/webhook-handler";

/** Webhook de WhatsApp Business de un negocio (ADR 0010). La lógica está en `lib/integrations/channels/webhook-handler.ts`. */
export async function GET(request: Request, ctx: { params: Promise<{ connectionId: string }> }) {
  return verifyWebhookRequest((await ctx.params).connectionId, new URL(request.url).searchParams);
}

export async function POST(request: Request, ctx: { params: Promise<{ connectionId: string }> }) {
  return receiveWebhookRequest((await ctx.params).connectionId, await request.text(), request.headers.get("x-hub-signature-256"));
}
