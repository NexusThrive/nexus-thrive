import { db } from "@/prisma/db";
import { ticketCode, type TicketPriorityValue, type TicketStatusValue, validateTicket } from "./support-rules";

/** Soporte de NEXUS: acceso a datos (servidor). */

const now = () => Temporal.Instant.fromEpochMilliseconds(Date.now());
const ms = (v: unknown) => (v ? Date.parse(String(v)) : null);

export type TicketRow = {
  id: string;
  code: string;
  tenantId: string | null;
  tenantName: string | null;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriorityValue;
  status: TicketStatusValue;
  channel: string;
  assigneeId: string | null;
  assigneeName: string | null;
  requesterName: string | null;
  requesterContact: string | null;
  solution: string | null;
  createdAt: number;
  updatedAt: number;
  firstResponseAt: number | null;
  resolvedAt: number | null;
  closedAt: number | null;
};

async function lookups() {
  const [staff, tenants] = await Promise.all([
    db.orm.public.StaffMember.select("id", "name", "email").all(),
    db.orm.public.Tenant.select("id", "name").all(),
  ]);
  return { staff: new Map(staff.map((s) => [s.id, s.name ?? s.email])), tenants: new Map(tenants.map((t) => [t.id, t.name])) };
}

type Raw = Awaited<ReturnType<typeof db.orm.public.SupportTicket.first>>;

function toRow(t: NonNullable<Raw>, l: Awaited<ReturnType<typeof lookups>>): TicketRow {
  return {
    id: t.id,
    code: ticketCode(t.year, t.seq),
    tenantId: t.tenantId,
    tenantName: t.tenantId ? (l.tenants.get(t.tenantId) ?? null) : null,
    subject: t.subject,
    description: t.description,
    category: t.category,
    priority: t.priority as TicketPriorityValue,
    status: t.status as TicketStatusValue,
    channel: t.channel,
    assigneeId: t.assigneeId,
    assigneeName: t.assigneeId ? (l.staff.get(t.assigneeId) ?? null) : null,
    requesterName: t.requesterName,
    requesterContact: t.requesterContact,
    solution: t.solution,
    createdAt: ms(t.createdAt)!,
    updatedAt: ms(t.updatedAt)!,
    firstResponseAt: ms(t.firstResponseAt),
    resolvedAt: ms(t.resolvedAt),
    closedAt: ms(t.closedAt),
  };
}

export async function listTickets(filter: { tenantId?: string } = {}): Promise<TicketRow[]> {
  let q = db.orm.public.SupportTicket.orderBy((t) => t.createdAt.desc());
  if (filter.tenantId) q = q.where({ tenantId: filter.tenantId });
  const [rows, l] = await Promise.all([q.all(), lookups()]);
  return rows.map((r) => toRow(r, l));
}

export async function getTicket(id: string): Promise<TicketRow | null> {
  const [row, l] = await Promise.all([db.orm.public.SupportTicket.where({ id }).first(), lookups()]);
  return row ? toRow(row, l) : null;
}

export type TicketMessageRow = { id: string; internal: boolean; body: string; authorName: string; createdAt: number };

export async function listTicketMessages(ticketId: string): Promise<TicketMessageRow[]> {
  const rows = await db.orm.public.TicketMessage.where({ ticketId }).orderBy((m) => m.createdAt.asc()).all();
  return rows.map((m) => ({ id: m.id, internal: m.internal, body: m.body, authorName: m.authorName, createdAt: ms(m.createdAt)! }));
}

/** Crea el ticket con el siguiente consecutivo del año (reintenta si dos chocan). */
export async function createTicket(v: Extract<ReturnType<typeof validateTicket>, { ok: true }>["value"]): Promise<{ id: string; code: string }> {
  const year = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric" }).format(new Date()));
  for (let attempt = 0; attempt < 5; attempt++) {
    const { top } = await db.orm.public.SupportTicket.where({ year }).aggregate((a) => ({ top: a.max("seq") }));
    const seq = (top ?? 0) + 1;
    try {
      const row = await db.orm.public.SupportTicket.create({ ...v, year, seq, status: v.assigneeId ? "OPEN" : "NEW" });
      return { id: row.id, code: ticketCode(year, seq) };
    } catch (e) {
      if (attempt === 4 || !/unique|duplicate/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  }
  throw new Error("No se pudo numerar el ticket.");
}

export async function addTicketMessage(ticketId: string, body: string, internal: boolean, author: { staffId: string; name: string | null; email: string }) {
  await db.orm.public.TicketMessage.create({ ticketId, body, internal, authorStaffId: author.staffId, authorName: author.name ?? author.email });
}

/** Marca la primera respuesta (solo la primera vez). */
export async function markFirstResponse(ticketId: string) {
  const t = await db.orm.public.SupportTicket.where({ id: ticketId }).select("firstResponseAt", "status").first();
  if (t && !t.firstResponseAt) await db.orm.public.SupportTicket.where({ id: ticketId }).update({ firstResponseAt: now(), ...(t.status === "NEW" ? { status: "OPEN" as const } : {}) });
}

export async function setTicketStatus(ticketId: string, status: TicketStatusValue, solution: string | null) {
  const stamp = now();
  await db.orm.public.SupportTicket.where({ id: ticketId }).update({
    status,
    ...(solution != null ? { solution } : {}),
    ...(status === "RESOLVED" ? { resolvedAt: stamp } : {}),
    ...(status === "CLOSED" ? { closedAt: stamp } : {}),
    ...(status === "OPEN" ? { resolvedAt: null, closedAt: null } : {}),
  });
}

export async function updateTicketFields(ticketId: string, fields: { assigneeId?: string | null; priority?: TicketPriorityValue; category?: string; tenantId?: string | null }) {
  await db.orm.public.SupportTicket.where({ id: ticketId }).update(fields);
}
