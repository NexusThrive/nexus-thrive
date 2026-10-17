import { randomBytes } from "node:crypto";
import { db } from "@/prisma/db";
import { getAppBaseUrl } from "@/lib/app-url";
import { ticketCode } from "./support-rules";

/** Encuestas de satisfacción de soporte (servidor). */

const ms = (v: unknown) => (v ? Date.parse(String(v)) : null);

export function surveyUrl(token: string) {
  return `${getAppBaseUrl()}/encuesta/${token}`;
}

/** Crea la encuesta del ticket resuelto (una por ticket). Devuelve el enlace. */
export async function ensureSurvey(ticketId: string): Promise<string | null> {
  const existing = await db.orm.public.SatisfactionSurvey.where({ ticketId }).select("token").first();
  if (existing) return surveyUrl(existing.token);
  const t = await db.orm.public.SupportTicket.where({ id: ticketId }).select("tenantId", "assigneeId").first();
  if (!t) return null;
  const token = randomBytes(18).toString("base64url");
  await db.orm.public.SatisfactionSurvey.create({ ticketId, tenantId: t.tenantId, assigneeId: t.assigneeId, token });
  return surveyUrl(token);
}

export async function getSurveyByToken(token: string) {
  if (!/^[\w-]{20,40}$/.test(token)) return null;
  const s = await db.orm.public.SatisfactionSurvey.where({ token }).first();
  if (!s) return null;
  const [t, tenant] = await Promise.all([
    db.orm.public.SupportTicket.where({ id: s.ticketId }).select("year", "seq", "subject").first(),
    s.tenantId ? db.orm.public.Tenant.where({ id: s.tenantId }).select("name").first() : null,
  ]);
  return { id: s.id, answered: !!s.answeredAt, score: s.score, code: t ? ticketCode(t.year, t.seq) : "", subject: t?.subject ?? "", tenantName: tenant?.name ?? null };
}

export async function answerSurvey(id: string, v: { score: number; nps: number | null; comment: string | null }) {
  await db.orm.public.SatisfactionSurvey.where({ id }).update({ ...v, answeredAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) });
}

export type SurveyRow = {
  id: string;
  ticketId: string;
  code: string;
  subject: string;
  tenantId: string | null;
  tenantName: string | null;
  assigneeName: string | null;
  score: number | null;
  nps: number | null;
  comment: string | null;
  sentAt: number;
  answeredAt: number | null;
  url: string;
};

export async function listSurveys(filter: { tenantId?: string } = {}): Promise<SurveyRow[]> {
  let q = db.orm.public.SatisfactionSurvey.orderBy((s) => s.sentAt.desc());
  if (filter.tenantId) q = q.where({ tenantId: filter.tenantId });
  const [rows, tickets, tenants, staff] = await Promise.all([
    q.all(),
    db.orm.public.SupportTicket.select("id", "year", "seq", "subject").all(),
    db.orm.public.Tenant.select("id", "name").all(),
    db.orm.public.StaffMember.select("id", "name", "email").all(),
  ]);
  const tk = new Map(tickets.map((t) => [t.id, t]));
  const tn = new Map(tenants.map((t) => [t.id, t.name]));
  const sn = new Map(staff.map((s) => [s.id, s.name ?? s.email]));
  return rows.map((s) => {
    const t = tk.get(s.ticketId);
    return {
      id: s.id,
      ticketId: s.ticketId,
      code: t ? ticketCode(t.year, t.seq) : "",
      subject: t?.subject ?? "",
      tenantId: s.tenantId,
      tenantName: s.tenantId ? (tn.get(s.tenantId) ?? null) : null,
      assigneeName: s.assigneeId ? (sn.get(s.assigneeId) ?? null) : null,
      score: s.score,
      nps: s.nps,
      comment: s.comment,
      sentAt: ms(s.sentAt)!,
      answeredAt: ms(s.answeredAt),
      url: surveyUrl(s.token),
    };
  });
}
