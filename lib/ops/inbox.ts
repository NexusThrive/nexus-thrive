import { db } from "@/prisma/db";
import { normalizeHandle, samePhone, type Channel } from "./inbox-rules";
import { sendEmail, sendWhatsapp, type SendResult } from "./inbox-providers";
import { createTicket } from "./tickets";

/** Bandeja de NEXUS: conversaciones de WhatsApp y correo (servidor). */

const ms = (v: unknown) => (v ? Date.parse(String(v)) : null);
const instant = (n: number) => Temporal.Instant.fromEpochMilliseconds(n);

export type ConversationRow = {
  id: string;
  channel: Channel;
  contactHandle: string;
  contactName: string | null;
  tenantId: string | null;
  tenantName: string | null;
  subject: string | null;
  status: "OPEN" | "PENDING" | "CLOSED";
  assigneeId: string | null;
  assigneeName: string | null;
  ticketId: string | null;
  unread: number;
  lastMessageAt: number;
  lastInboundAt: number | null;
  preview: string;
};

export type InboxMessageRow = { id: string; direction: "IN" | "OUT" | "NOTE"; body: string; delivery: string; error: string | null; authorName: string | null; createdAt: number };

export async function listConversations(): Promise<ConversationRow[]> {
  const [rows, tenants, staff] = await Promise.all([
    db.orm.public.InboxConversation.orderBy((c) => c.lastMessageAt.desc()).all(),
    db.orm.public.Tenant.select("id", "name").all(),
    db.orm.public.StaffMember.select("id", "name", "email").all(),
  ]);
  const ids = rows.map((r) => r.id);
  const last = ids.length ? await db.orm.public.InboxMessage.where((m) => m.conversationId.in(ids)).select("conversationId", "body", "createdAt").orderBy((m) => m.createdAt.desc()).all() : [];
  const preview = new Map<string, string>();
  for (const m of last) if (!preview.has(m.conversationId)) preview.set(m.conversationId, m.body);
  const tn = new Map(tenants.map((t) => [t.id, t.name]));
  const sn = new Map(staff.map((s) => [s.id, s.name ?? s.email]));
  return rows.map((c) => ({
    id: c.id,
    channel: c.channel as Channel,
    contactHandle: c.contactHandle,
    contactName: c.contactName,
    tenantId: c.tenantId,
    tenantName: c.tenantId ? (tn.get(c.tenantId) ?? null) : null,
    subject: c.subject,
    status: c.status as ConversationRow["status"],
    assigneeId: c.assigneeId,
    assigneeName: c.assigneeId ? (sn.get(c.assigneeId) ?? null) : null,
    ticketId: c.ticketId,
    unread: c.unread,
    lastMessageAt: ms(c.lastMessageAt)!,
    lastInboundAt: ms(c.lastInboundAt),
    preview: (preview.get(c.id) ?? "").slice(0, 140),
  }));
}

export async function listInboxMessages(conversationId: string): Promise<InboxMessageRow[]> {
  const rows = await db.orm.public.InboxMessage.where({ conversationId }).orderBy((m) => m.createdAt.asc()).all();
  return rows.map((m) => ({ id: m.id, direction: m.direction as InboxMessageRow["direction"], body: m.body, delivery: m.delivery, error: m.error, authorName: m.authorName, createdAt: ms(m.createdAt)! }));
}

/** Busca el negocio del contacto: contactos del negocio, usuarios o leads ganados. */
async function matchTenant(channel: Channel, handle: string): Promise<string | null> {
  if (channel === "EMAIL") {
    const c = await db.orm.public.TenantContact.where({ email: handle }).select("tenantId").first();
    if (c) return c.tenantId;
    const u = await db.orm.public.User.where({ email: handle }).select("tenantId").first();
    return u?.tenantId ?? null;
  }
  const contacts = await db.orm.public.TenantContact.select("tenantId", "phone", "whatsapp").all();
  return contacts.find((c) => samePhone(c.whatsapp, handle) || samePhone(c.phone, handle))?.tenantId ?? null;
}

/** Mensaje entrante (webhook). Idempotente por id del proveedor. */
export async function ingestInbound(m: { channel: Channel; handle: string; name: string | null; body: string; externalId: string | null; subject?: string | null; at?: number }) {
  const handle = normalizeHandle(m.channel, m.handle);
  if (!handle) return null;
  if (m.externalId && (await db.orm.public.InboxMessage.where({ externalId: m.externalId }).select("id").first())) return null;
  const at = instant(m.at ?? Date.now());
  let conv = await db.orm.public.InboxConversation.where({ channel: m.channel, contactHandle: handle }).first();
  if (!conv) {
    conv = await db.orm.public.InboxConversation.create({ channel: m.channel, contactHandle: handle, contactName: m.name, subject: m.subject ?? null, tenantId: await matchTenant(m.channel, handle), lastMessageAt: at, lastInboundAt: at, unread: 0 });
  }
  await db.orm.public.InboxMessage.create({ conversationId: conv.id, direction: "IN", body: m.body, externalId: m.externalId, delivery: "received" });
  await db.orm.public.InboxConversation.where({ id: conv.id }).update({
    lastMessageAt: at,
    lastInboundAt: at,
    unread: conv.unread + 1,
    status: "OPEN",
    ...(m.name && !conv.contactName ? { contactName: m.name } : {}),
    ...(m.subject && !conv.subject ? { subject: m.subject } : {}),
  });
  return conv.id;
}

/** Respuesta del equipo: por el proveedor si está configurado; si no, queda "manual". */
export async function reply(conversationId: string, body: string, author: { staffId: string; name: string | null; email: string }): Promise<SendResult> {
  const c = await db.orm.public.InboxConversation.where({ id: conversationId }).first();
  if (!c) return { delivery: "failed", error: "La conversación no existe." };
  const r = c.channel === "WHATSAPP" ? await sendWhatsapp(c.contactHandle, body) : await sendEmail(c.contactHandle, c.subject ? `Re: ${c.subject.replace(/^re:\s*/i, "")}` : "NEXUS THRIVE", body);
  await db.orm.public.InboxMessage.create({
    conversationId,
    direction: "OUT",
    body,
    externalId: r.delivery === "sent" ? r.externalId : null,
    delivery: r.delivery,
    error: r.delivery === "failed" ? r.error : null,
    authorStaffId: author.staffId,
    authorName: author.name ?? author.email,
  });
  await db.orm.public.InboxConversation.where({ id: conversationId }).update({ lastMessageAt: instant(Date.now()), unread: 0, status: "PENDING" });
  return r;
}

export async function addInboxNote(conversationId: string, body: string, author: { staffId: string; name: string | null; email: string }) {
  await db.orm.public.InboxMessage.create({ conversationId, direction: "NOTE", body, delivery: "manual", authorStaffId: author.staffId, authorName: author.name ?? author.email });
}

export async function markRead(conversationId: string) {
  await db.orm.public.InboxConversation.where({ id: conversationId }).update({ unread: 0 });
}

export async function updateConversation(id: string, fields: { status?: "OPEN" | "PENDING" | "CLOSED"; assigneeId?: string | null; tenantId?: string | null }) {
  await db.orm.public.InboxConversation.where({ id }).update(fields);
}

/** Convierte la conversación en ticket (con los últimos mensajes del contacto). */
export async function conversationToTicket(id: string, assigneeId: string) {
  const c = await db.orm.public.InboxConversation.where({ id }).first();
  if (!c || c.ticketId) return null;
  const msgs = (await listInboxMessages(id)).filter((m) => m.direction === "IN").slice(-5);
  const description = msgs.map((m) => m.body).join("\n\n") || "(sin texto)";
  const t = await createTicket({
    tenantId: c.tenantId,
    subject: (c.subject ?? msgs.at(-1)?.body ?? "Consulta").slice(0, 120),
    description,
    category: "Duda o capacitación",
    priority: "NORMAL",
    channel: c.channel === "WHATSAPP" ? "WhatsApp" : "Correo",
    requesterName: c.contactName,
    requesterContact: c.contactHandle,
    assigneeId,
  });
  await db.orm.public.InboxConversation.where({ id }).update({ ticketId: t.id });
  return t;
}
