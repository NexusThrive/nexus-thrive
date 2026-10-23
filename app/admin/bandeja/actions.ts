"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/ops/access";
import { tenantName } from "@/lib/ops/accounts";
import { logOps } from "@/lib/ops/audit";
import { addInboxNote, conversationToTicket, markRead, reply, updateConversation } from "@/lib/ops/inbox";

export type InboxResult = { ok: true; message?: string; delivery?: string; id?: string } | { ok: false; message: string };
const DENIED = { ok: false as const, message: "No tienes permiso para esta acción." };

function refresh() {
  revalidatePath("/admin/bandeja");
  revalidatePath("/admin");
}

export async function replyAction(conversationId: string, body: string, note: boolean): Promise<InboxResult> {
  const ctx = await requireStaff("tickets.reply");
  if (!ctx) return DENIED;
  const text = body.trim().slice(0, 4000);
  if (text.length < 1) return { ok: false, message: "Escribe el mensaje." };
  if (note) {
    await addInboxNote(conversationId, text, ctx);
    refresh();
    return { ok: true, message: "Nota guardada" };
  }
  const r = await reply(conversationId, text, ctx);
  refresh();
  if (r.delivery === "failed") return { ok: false, message: `No se envió: ${r.error}` };
  return { ok: true, delivery: r.delivery, message: r.delivery === "sent" ? "Mensaje enviado" : "Respuesta registrada: envíala con el botón" };
}

export async function markReadAction(conversationId: string): Promise<InboxResult> {
  const ctx = await requireStaff("tickets.view");
  if (!ctx) return DENIED;
  await markRead(conversationId);
  refresh();
  return { ok: true };
}

export async function updateConversationAction(id: string, fields: { status?: string; assigneeId?: string | null; tenantId?: string | null }): Promise<InboxResult> {
  const ctx = await requireStaff("tickets.reply");
  if (!ctx) return DENIED;
  const status = fields.status === "OPEN" || fields.status === "PENDING" || fields.status === "CLOSED" ? fields.status : undefined;
  if (fields.tenantId) {
    if ((await tenantName(fields.tenantId)) === null) return { ok: false, message: "El negocio no existe." };
  }
  await updateConversation(id, { ...(status ? { status } : {}), ...(fields.assigneeId !== undefined ? { assigneeId: fields.assigneeId } : {}), ...(fields.tenantId !== undefined ? { tenantId: fields.tenantId } : {}) });
  refresh();
  return { ok: true, message: "Conversación actualizada" };
}

export async function toTicketAction(id: string): Promise<InboxResult> {
  const ctx = await requireStaff("tickets.reply");
  if (!ctx) return DENIED;
  const t = await conversationToTicket(id, ctx.staffId);
  if (!t) return { ok: false, message: "La conversación ya tiene ticket." };
  await logOps(ctx, "TICKET_SAVE", { metadata: { ticketId: t.id, code: t.code, fromInbox: id } });
  refresh();
  revalidatePath("/admin/soporte");
  return { ok: true, id: t.id, message: `Ticket ${t.code} creado` };
}
