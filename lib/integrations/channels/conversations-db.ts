import { findOrCreateContact } from "@/lib/business/customers/contacts-db";
import { decryptCredentials } from "@/lib/integrations/providers/connections";
import { db } from "@/prisma/db";
import { manualLink, messagingWindow, sendText, whatsappHandle, type InboundMessage, type StatusUpdate, type WhatsappCredentials } from "./whatsapp-cloud";

/**
 * Conversaciones del negocio por su propio WhatsApp (HU-whatsapp-negocio-01, ADR 0010). Todo por `tenantId`; no toca la bandeja de
 * soporte de Nexus. Un mensaje entrante encuentra o crea el contacto único por teléfono y queda en su línea de tiempo.
 */
export type ConversationRow = { id: string; contactHandle: string; contactName: string | null; customerId: string | null; customerName: string | null; unread: number; lastMessageAt: string; windowOpen: boolean; lastBody: string | null };
export type MessageRow = { id: string; direction: "IN" | "OUT"; body: string; status: string; error: string | null; createdAt: string };

const instant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);

/** Conexión de WhatsApp activa del negocio, con sus credenciales descifradas (solo para uso del servidor). */
export async function whatsappConnection(tenantId: string): Promise<{ id: string; credentials: WhatsappCredentials } | null> {
  const c = await db.orm.public.ExternalConnection.where({ tenantId, kind: "MESSAGING", provider: "whatsapp_cloud", status: "CONNECTED" }).first();
  if (!c?.credentialsEnc) return null;
  try {
    return { id: c.id, credentials: decryptCredentials(c.credentialsEnc) as unknown as WhatsappCredentials };
  } catch {
    return null;
  }
}

/** Guarda un mensaje entrante: encuentra o crea el contacto, abre o reutiliza la conversación y no duplica un aviso repetido. */
export async function ingestInbound(tenantId: string, connectionId: string, m: InboundMessage): Promise<{ stored: boolean; conversationId: string }> {
  return db.transaction(async (tx) => {
    const existing = await tx.orm.public.BusinessMessage.where({ tenantId, externalId: m.externalId }).select("conversationId").first();
    if (existing) return { stored: false, conversationId: existing.conversationId };
    const contact = await findOrCreateContact(tx, tenantId, { name: m.name ?? m.handle, phone: m.handle, source: "WHATSAPP", stage: "PROSPECT" });
    let convo = await tx.orm.public.BusinessConversation.where({ tenantId, channel: "WHATSAPP", contactHandle: m.handle }).first();
    const at = instant(m.at);
    if (!convo) {
      convo = await tx.orm.public.BusinessConversation.create({ tenantId, connectionId, contactHandle: m.handle, contactName: m.name, customerId: contact?.id ?? null, unread: 1, lastMessageAt: at, lastInboundAt: at });
    } else {
      await tx.orm.public.BusinessConversation.where({ tenantId, id: convo.id }).update({ unread: convo.unread + 1, lastMessageAt: at, lastInboundAt: at, status: "OPEN", ...(convo.customerId || !contact ? {} : { customerId: contact.id }), ...(m.name && !convo.contactName ? { contactName: m.name } : {}) });
    }
    await tx.orm.public.BusinessMessage.create({ tenantId, conversationId: convo.id, direction: "IN", body: m.body, status: "RECEIVED", externalId: m.externalId });
    return { stored: true, conversationId: convo.id };
  });
}

/** Actualiza el estado de un mensaje enviado (enviado, entregado, leído o fallido). Nunca baja un estado ya alcanzado. */
export async function applyStatus(tenantId: string, s: StatusUpdate): Promise<boolean> {
  const rank: Record<string, number> = { MANUAL: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 3 };
  const msg = await db.orm.public.BusinessMessage.where({ tenantId, externalId: s.externalId, direction: "OUT" }).first();
  if (!msg || (rank[s.status] ?? 0) <= (rank[msg.status] ?? 0)) return false;
  await db.orm.public.BusinessMessage.where({ tenantId, id: msg.id }).update({ status: s.status, error: s.error });
  return true;
}

export type SendOutcome = { ok: true; delivery: "sent" | "manual"; link?: string; message: string } | { ok: false; message: string };

/**
 * Responde a un contacto. Dentro de las 24 h y con la conexión activa, sale por la API. Fuera de la ventana, sin conexión o si Meta
 * falla, queda «listo para enviar con un toque» (`wa.me`): NUNCA se marca como enviado lo que no salió.
 */
export async function replyTo(tenantId: string, conversationId: string, body: string, userId: string, now = Date.now()): Promise<SendOutcome> {
  const text = body.trim();
  if (text.length < 1) return { ok: false, message: "Escribe el mensaje." };
  if (text.length > 1000) return { ok: false, message: "El mensaje es muy largo (máximo 1000 caracteres)." };
  const convo = await db.orm.public.BusinessConversation.where({ tenantId, id: conversationId }).first();
  if (!convo) return { ok: false, message: "No se encontró la conversación." };
  const connection = await whatsappConnection(tenantId);
  const window = messagingWindow(convo.lastInboundAt ? new Date(String(convo.lastInboundAt)).getTime() : null, now);
  const save = (status: string, externalId: string | null, error: string | null) => db.orm.public.BusinessMessage.create({ tenantId, conversationId, direction: "OUT", body: text, status, externalId, error, createdById: userId });
  const touch = () => db.orm.public.BusinessConversation.where({ tenantId, id: conversationId }).update({ lastMessageAt: instant(now), unread: 0 });

  if (connection && window.open) {
    const sent = await sendText(connection.credentials, convo.contactHandle, text);
    if (sent.delivery === "sent") {
      await save("SENT", sent.externalId, null);
      await touch();
      return { ok: true, delivery: "sent", message: "Mensaje enviado" };
    }
    await save("MANUAL", null, sent.error);
    await touch();
    return { ok: true, delivery: "manual", link: manualLink(convo.contactHandle, text), message: `WhatsApp no lo envió (${sent.error}). Queda listo para enviarlo con un toque.` };
  }
  await save("MANUAL", null, connection ? "Fuera de la ventana de 24 h" : "Sin conexión de WhatsApp");
  await touch();
  return { ok: true, delivery: "manual", link: manualLink(convo.contactHandle, text), message: connection ? "Pasaron más de 24 h desde su último mensaje: queda listo para enviarlo con un toque." : "Aún no conectas tu número: queda listo para enviarlo con un toque." };
}

/** Conversaciones del negocio, las más recientes primero, con el nombre de la ficha y si la ventana de 24 h sigue abierta. */
export async function listConversations(tenantId: string, limit = 100, now = Date.now()): Promise<ConversationRow[]> {
  const rows = await db.orm.public.BusinessConversation.where({ tenantId }).orderBy((c) => c.lastMessageAt.desc()).limit(limit).all();
  const ids = [...new Set(rows.map((r) => r.customerId).filter((x): x is string => Boolean(x)))];
  const customers = ids.length ? await db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(ids)).select("id", "name").all() : [];
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const last = new Map<string, string>();
  for (const r of rows) {
    const m = await db.orm.public.BusinessMessage.where({ tenantId, conversationId: r.id }).orderBy((x) => x.createdAt.desc()).first();
    if (m) last.set(r.id, m.body);
  }
  return rows.map((c) => ({ id: c.id, contactHandle: c.contactHandle, contactName: c.contactName, customerId: c.customerId, customerName: c.customerId ? (names.get(c.customerId) ?? null) : null, unread: c.unread, lastMessageAt: String(c.lastMessageAt), windowOpen: messagingWindow(c.lastInboundAt ? new Date(String(c.lastInboundAt)).getTime() : null, now).open, lastBody: last.get(c.id) ?? null }));
}

/** Mensajes de una conversación (los últimos 100, del más antiguo al más reciente) y la deja como leída. */
export async function openConversation(tenantId: string, conversationId: string): Promise<MessageRow[] | null> {
  const convo = await db.orm.public.BusinessConversation.where({ tenantId, id: conversationId }).first();
  if (!convo) return null;
  if (convo.unread > 0) await db.orm.public.BusinessConversation.where({ tenantId, id: conversationId }).update({ unread: 0 });
  const msgs = await db.orm.public.BusinessMessage.where({ tenantId, conversationId }).orderBy((m) => m.createdAt.desc()).limit(100).all();
  return msgs.reverse().map((m) => ({ id: m.id, direction: m.direction as "IN" | "OUT", body: m.body, status: m.status, error: m.error, createdAt: String(m.createdAt) }));
}

export { whatsappHandle };
