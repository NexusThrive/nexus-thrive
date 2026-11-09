import { formatCurrency } from "@/lib/foundation/format";
import type { DbWriter } from "@/lib/foundation/db/db-transaction";
import type { EventSubscriber } from "@/lib/core/events/dispatcher";
import { db } from "@/prisma/db";
import { manualLink, messagingWindow, sendTemplate, sendText } from "./whatsapp-cloud";
import { whatsappConnection } from "./conversations-db";
import { DEFAULT_TEMPLATES, NOTICE_SOURCES, decideSend, noticeEventFor, hasMissingVariables, renderTemplate, validateTemplate, variablesOf, type MetaStatus, type NoticeEvent } from "./notices";

/** Plantillas y avisos de WhatsApp del negocio (HU-whatsapp-negocio-02). Todo por `tenantId`. */
export type TemplateRow = { id: string; key: string; title: string; body: string; event: string | null; metaName: string | null; metaStatus: MetaStatus; language: string; enabled: boolean; variables: string[] };
export type NoticeRow = { id: string; customerId: string; customerName: string | null; templateKey: string; event: string; status: "PENDING" | "SENT" | "MANUAL" | "BLOCKED" | "FAILED"; reason: string | null; text: string | null; link: string | null; createdAt: string };
type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const instant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);
const toTemplate = (t: { id: string; key: string; title: string; body: string; event: string | null; metaName: string | null; metaStatus: string; language: string; enabled: boolean }): TemplateRow => ({ id: t.id, key: t.key, title: t.title, body: t.body, event: t.event, metaName: t.metaName, metaStatus: t.metaStatus as MetaStatus, language: t.language, enabled: t.enabled, variables: variablesOf(t.body) });

/** Crea las plantillas de partida que falten (idempotente; nunca pisa las editadas). */
export async function ensureDefaultTemplates(tenantId: string): Promise<void> {
  const have = new Set((await db.orm.public.MessageTemplate.where({ tenantId }).select("key").all()).map((t) => t.key));
  for (const t of DEFAULT_TEMPLATES) if (!have.has(t.key)) await db.orm.public.MessageTemplate.create({ tenantId, key: t.key, title: t.title, body: t.body, event: t.event });
}

export async function listTemplates(tenantId: string): Promise<TemplateRow[]> {
  await ensureDefaultTemplates(tenantId);
  return (await db.orm.public.MessageTemplate.where({ tenantId }).orderBy((t) => t.key.asc()).limit(100).all()).map(toTemplate);
}

export async function saveTemplate(tenantId: string, input: { key: string; title: string; body: string; event?: string | null; enabled?: boolean }): Promise<Result> {
  const problem = validateTemplate(input);
  if (problem) return { ok: false, message: problem };
  const found = await db.orm.public.MessageTemplate.where({ tenantId, key: input.key }).first();
  const data = { title: input.title.trim().slice(0, 80), body: input.body.trim(), event: input.event || null, enabled: input.enabled ?? true };
  // Cambiar el texto invalida la aprobación de Meta: hay que volver a aprobarlo.
  if (found) await db.orm.public.MessageTemplate.where({ tenantId, id: found.id }).update({ ...data, ...(found.body !== data.body ? { metaStatus: "NONE" } : {}) });
  else await db.orm.public.MessageTemplate.create({ tenantId, key: input.key, ...data });
  return { ok: true };
}

/** Registra el estado de la aprobación en Meta (la aprobación se pide y se da en Meta; aquí solo se anota). */
export async function setMetaStatus(tenantId: string, id: string, status: MetaStatus, metaName: string | null): Promise<Result> {
  if (status === "APPROVED" && !(metaName && /^[a-z][a-z0-9_]{2,60}$/.test(metaName.trim()))) return { ok: false, message: "Escribe el nombre exacto de la plantilla en Meta (minúsculas y guion bajo)." };
  const found = await db.orm.public.MessageTemplate.where({ tenantId, id }).select("id").first();
  if (!found) return { ok: false, message: "No se encontró la plantilla." };
  await db.orm.public.MessageTemplate.where({ tenantId, id }).update({ metaStatus: status, metaName: metaName?.trim() || null });
  return { ok: true };
}

/** Deja un aviso en cola. Un mismo hecho (`sourceId`) avisa una sola vez. Sin plantilla activa para ese hecho no hace nada. */
export async function queueNotice(tx: DbWriter, tenantId: string, event: NoticeEvent, sourceId: string, customerId: string | null | undefined, variables: Record<string, string | number>): Promise<boolean> {
  if (!customerId) return false;
  const template = await tx.orm.public.MessageTemplate.where({ tenantId, event, enabled: true }).first();
  if (!template) return false;
  if (await tx.orm.public.WhatsappNotice.where({ tenantId, event, sourceId }).select("id").first()) return false;
  await tx.orm.public.WhatsappNotice.create({ tenantId, customerId, templateKey: template.key, event, sourceId, variables: variables as never });
  return true;
}

/**
 * Convierte en avisos los hechos recientes del negocio (pedido creado, pagado o sin pagar). Lee el outbox: el hecho ya ocurrió y quedó
 * registrado en la misma transacción que lo causó; aquí solo se decide si avisa. Repetirlo no duplica (un hecho avisa una sola vez).
 */
export async function collectNotices(tenantId: string, now = Date.now()): Promise<number> {
  await ensureDefaultTemplates(tenantId);
  const since = instant(now - 2 * 86_400_000);
  const events = await db.orm.public.OutboxEvent.where({ tenantId }).where((e) => e.createdAt.gte(since)).where((e) => e.type.in([...NOTICE_SOURCES])).orderBy((e) => e.createdAt.asc()).limit(200).all();
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).select("name").first();
  let queued = 0;
  for (const e of events) {
    const payload = (e.payload ?? {}) as { order_id?: string; code?: string; total?: number; to?: string };
    const event = noticeEventFor(e.type, payload);
    if (!event) continue;
    const order = payload.order_id ? await db.orm.public.StoreOrder.where({ tenantId, id: payload.order_id }).select("customerId", "customerName").first() : null;
    if (await queueNotice(db, tenantId, event, e.id, order?.customerId, { codigo: payload.code ?? "", total: formatCurrency(payload.total ?? 0), negocio: tenant?.name ?? "" })) queued++;
  }
  return queued;
}

/** Suscriptor del despachador: tras cada corrida, convierte los hechos nuevos en avisos y procesa los pendientes. */
export const noticeSubscriber: EventSubscriber = {
  name: "avisos-whatsapp",
  matches: (type) => (NOTICE_SOURCES as readonly string[]).includes(type),
  handle: async (tenantId) => {
    await collectNotices(tenantId);
    await processNotices(tenantId);
  },
};

/**
 * Procesa los avisos pendientes de un negocio: para cada uno decide cómo sale (`decideSend`) y lo ejecuta. Sale por la API solo dentro de
 * la ventana de 24 h o con plantilla aprobada; si no, queda «listo para enviar con un toque»; una baja lo bloquea. Es idempotente: solo
 * toma los que siguen pendientes.
 */
export async function processNotices(tenantId: string, now = Date.now()): Promise<{ sent: number; manual: number; blocked: number; failed: number }> {
  const out = { sent: 0, manual: 0, blocked: 0, failed: 0 };
  const pending = await db.orm.public.WhatsappNotice.where({ tenantId, status: "PENDING" }).orderBy((n) => n.createdAt.asc()).limit(100).all();
  if (!pending.length) return out;
  const connection = await whatsappConnection(tenantId);
  for (const n of pending) {
    const claim = db.sql.public.WhatsappNotice.update({ status: "PROCESSING" }).where((f, fns) => fns.and(fns.eq(f.id, n.id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "PENDING"))).returning("id").build();
    if ((await db.transaction((tx) => tx.query(claim))).length === 0) continue;
    const finish = (status: NoticeRow["status"], reason: string | null, messageId: string | null = null) => db.orm.public.WhatsappNotice.where({ tenantId, id: n.id }).update({ status, reason, messageId, processedAt: instant(now) });
    const customer = await db.orm.public.Customer.where({ tenantId, id: n.customerId }).first();
    const template = await db.orm.public.MessageTemplate.where({ tenantId, key: n.templateKey }).first();
    if (!customer?.phoneNorm || !template) {
      await finish("FAILED", !template ? "La plantilla ya no existe." : "El contacto no tiene teléfono.");
      out.failed++;
      continue;
    }
    const vars = (n.variables ?? {}) as Record<string, string | number>;
    const text = renderTemplate(template.body, { nombre: customer.name.split(" ")[0], ...vars });
    if (hasMissingVariables(text)) {
      await finish("FAILED", "Al aviso le faltan datos para llenar la plantilla.");
      out.failed++;
      continue;
    }
    let convo = await db.orm.public.BusinessConversation.where({ tenantId, channel: "WHATSAPP", contactHandle: customer.phoneNorm }).first();
    if (!convo) convo = await db.orm.public.BusinessConversation.create({ tenantId, connectionId: connection?.id ?? "ninguna", contactHandle: customer.phoneNorm, contactName: customer.name, customerId: customer.id });
    const decision = decideSend({
      optedOut: customer.optOutAt != null,
      consent: customer.consentAt != null || convo.lastInboundAt != null,
      connected: connection !== null,
      windowOpen: messagingWindow(convo.lastInboundAt ? new Date(String(convo.lastInboundAt)).getTime() : null, now).open,
      templateStatus: template.metaStatus as MetaStatus,
    });
    const saveMessage = (status: string, externalId: string | null, error: string | null) => db.orm.public.BusinessMessage.create({ tenantId, conversationId: convo!.id, direction: "OUT", body: text, status, externalId, error });
    const touch = () => db.orm.public.BusinessConversation.where({ tenantId, id: convo!.id }).update({ lastMessageAt: instant(now) });
    if (decision.action === "block") {
      await finish("BLOCKED", decision.reason);
      out.blocked++;
    } else if (decision.action === "manual") {
      const m = await saveMessage("MANUAL", null, decision.reason);
      await touch();
      await finish("MANUAL", decision.reason, m.id);
      out.manual++;
    } else {
      const sent = decision.action === "send_text" ? await sendText(connection!.credentials, customer.phoneNorm, text) : await sendTemplate(connection!.credentials, customer.phoneNorm, { name: template.metaName ?? template.key, language: template.language, params: variablesOf(template.body).map((v) => String(({ nombre: customer.name.split(" ")[0], ...vars } as Record<string, string | number>)[v] ?? "")) });
      if (sent.delivery === "sent") {
        const m = await saveMessage("SENT", sent.externalId, null);
        await touch();
        await finish("SENT", null, m.id);
        out.sent++;
      } else {
        const m = await saveMessage("MANUAL", null, sent.error);
        await touch();
        await finish("MANUAL", `WhatsApp no lo envió (${sent.error}).`, m.id);
        out.manual++;
      }
    }
  }
  return out;
}

/** Avisos recientes del negocio, con su texto y, si quedó listo para enviar con un toque, el enlace. */
export async function listNotices(tenantId: string, limit = 50): Promise<NoticeRow[]> {
  const rows = await db.orm.public.WhatsappNotice.where({ tenantId }).orderBy((n) => n.createdAt.desc()).limit(limit).all();
  if (!rows.length) return [];
  const [customers, messages] = await Promise.all([
    db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in([...new Set(rows.map((r) => r.customerId))])).select("id", "name", "phoneNorm").all(),
    db.orm.public.BusinessMessage.where({ tenantId }).where((m) => m.id.in(rows.map((r) => r.messageId).filter((x): x is string => Boolean(x)))).select("id", "body").all(),
  ]);
  const cust = new Map(customers.map((c) => [c.id, c]));
  const body = new Map(messages.map((m) => [m.id, m.body]));
  return rows.map((n) => {
    const text = n.messageId ? (body.get(n.messageId) ?? null) : null;
    const phone = cust.get(n.customerId)?.phoneNorm;
    return { id: n.id, customerId: n.customerId, customerName: cust.get(n.customerId)?.name ?? null, templateKey: n.templateKey, event: n.event, status: n.status as NoticeRow["status"], reason: n.reason, text, link: n.status === "MANUAL" && text && phone ? manualLink(phone, text) : null, createdAt: String(n.createdAt) };
  });
}

/** El contacto pidió no recibir más avisos (o vuelve a aceptarlos). */
export async function setOptOut(tenantId: string, customerId: string, optedOut: boolean): Promise<Result> {
  const found = await db.orm.public.Customer.where({ tenantId, id: customerId }).select("id").first();
  if (!found) return { ok: false, message: "No se encontró el contacto." };
  await db.orm.public.Customer.where({ tenantId, id: customerId }).update({ optOutAt: optedOut ? instant(Date.now()) : null });
  return { ok: true };
}

