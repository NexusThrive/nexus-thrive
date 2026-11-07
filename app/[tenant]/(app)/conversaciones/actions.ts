"use server";

import { revalidatePath } from "next/cache";
import { replyTo, type SendOutcome } from "@/lib/integrations/channels/conversations-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";

/** Responde a un contacto por el WhatsApp del negocio; fuera de la ventana o sin conexión queda listo para enviar con un toque. */
export async function replyAction(slug: string, conversationId: string, body: string): Promise<SendOutcome> {
  const ctx = await requireTenantContext(slug, "/conversaciones");
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  const r = await replyTo(ctx.tenantId, conversationId, body, ctx.memberId);
  if (r.ok) revalidatePath(`/${slug}/conversaciones`);
  return r;
}
