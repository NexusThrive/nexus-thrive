import { toNumber } from "@/lib/foundation/format";
import { or } from "@prisma/orm-postgres/orm-client";
import { escapeLike } from "@/lib/foundation/db/sql-like";
import { db } from "@/prisma/db";
import { ensureStages, loadPipeline, type NextActivity, type PipelineFilters, type PipelineStage } from "./pipeline-db";
import { ACTIVITY_LABEL, activityState, bogotaDay, isActivityKind, type ActivityKind } from "./pipeline";

/** Lecturas del CRM que no son el tablero: buscador de contactos, detalle, paginador, informes, actividades y lo que ven otras apps. */

export type PickerCustomer = { id: string; name: string; phone: string | null; email: string | null; kind: "PERSON" | "COMPANY"; document: string | null };

/** Clientes que coinciden por nombre, teléfono o correo (máx. 6) para el contacto de la creación rápida. */
export async function searchCustomersForPicker(tenantId: string, q: string): Promise<PickerCustomer[]> {
  const text = q.trim().slice(0, 60);
  if (text.length < 1) return [];
  const pattern = `%${escapeLike(text)}%`;
  const rows = await db.orm.public.Customer.where({ tenantId, active: true })
    .where((c) => or(c.name.ilike(pattern), c.phone.ilike(pattern), c.email.ilike(pattern)))
    .orderBy((c) => c.name.asc())
    .limit(6)
    .select("id", "name", "phone", "email", "documentId", "partyId")
    .all();
  const partyIds = rows.map((r) => r.partyId).filter((id): id is string => Boolean(id));
  const parties = partyIds.length ? await db.orm.public.Party.where({ tenantId }).where((p) => p.id.in(partyIds)).select("id", "kind").all() : [];
  const kinds = new Map(parties.map((p) => [p.id, p.kind]));
  return rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, kind: r.partyId && kinds.get(r.partyId) === "COMPANY" ? "COMPANY" : "PERSON", document: r.documentId }));
}

export type OpportunityEventRow = { id: string; kind: string; data: Record<string, unknown> | null; author: string | null; at: string };
export type ActivityRow = NextActivity & { done: boolean; assignee: string | null };
export type OpportunityDetail = {
  id: string;
  name: string;
  status: "OPEN" | "WON" | "LOST";
  value: number | null;
  probability: number;
  priority: number;
  expectedClose: string | null;
  tags: string[];
  description: string | null;
  source: string | null;
  lostReason: string | null;
  stageId: string;
  stageSince: string;
  createdAt: string;
  customer: { id: string; name: string; email: string | null; phone: string | null } | null;
  owner: { id: string; name: string } | null;
  order: { id: string; number: number; total: number; paid: boolean } | null;
  stages: PipelineStage[];
  activities: ActivityRow[];
  events: OpportunityEventRow[];
  team: { id: string; name: string }[];
  reasons: { id: string; name: string }[];
  files: { id: string; name: string; at: string }[];
};

/** Tipo de adjunto de los archivos de una oportunidad. */
export const OPPORTUNITY_FILE = "OPPORTUNITY_FILE";

const nameOf = (u: { name: string | null; email: string | null }) => u.name?.trim() || u.email?.split("@")[0] || "Integrante";

/** Detalle de una oportunidad del negocio (o `null`). */
export async function getOpportunityDetail(tenantId: string, id: string): Promise<OpportunityDetail | null> {
  const o = await db.orm.public.Opportunity.where({ tenantId, id }).first();
  if (!o) return null;
  const stages = await ensureStages(tenantId);
  const [customer, team, tasks, events, order, reasons, files] = await Promise.all([
    o.customerId ? db.orm.public.Customer.where({ tenantId, id: o.customerId }).select("id", "name", "email", "phone").first() : null,
    db.orm.public.User.where({ tenantId }).select("id", "name", "email", "active").all(),
    db.orm.public.Task.where({ tenantId, opportunityId: id }).orderBy((t) => t.createdAt.desc()).limit(50).all(),
    db.orm.public.OpportunityEvent.where({ tenantId, opportunityId: id }).orderBy((e) => e.createdAt.desc()).limit(100).all(),
    o.orderId ? db.orm.public.StoreOrder.where({ tenantId, id: o.orderId }).select("id", "number", "total", "paidAt", "status").first() : null,
    db.orm.public.CrmLostReason.where({ tenantId }).orderBy((r) => r.position.asc()).select("id", "name").all(),
    db.orm.public.Attachment.where({ tenantId, kind: OPPORTUNITY_FILE, ownerId: id }).orderBy((a) => a.createdAt.desc()).limit(50).select("id", "fileName", "createdAt").all(),
  ]);
  const people = new Map(team.map((u) => [u.id, nameOf(u)]));
  const stage = o.stageId ? stages.find((s) => s.id === o.stageId) : undefined;
  const fallback = o.status === "WON" ? (stages.find((s) => s.isWon) ?? stages.at(-1)!) : stages[0]!;
  const current = stage ?? fallback;
  return {
    id: o.id,
    name: o.interest,
    status: o.status as OpportunityDetail["status"],
    value: o.estimatedValue == null ? null : toNumber(o.estimatedValue),
    probability: o.status === "WON" ? 100 : o.status === "LOST" ? 0 : (o.probability ?? current.probability),
    priority: o.priority ?? 0,
    expectedClose: o.expectedClose ?? null,
    tags: [...(o.tags ?? [])],
    description: o.description ?? null,
    source: o.source && o.source !== "CRM" ? o.source : null,
    lostReason: o.lostReason,
    stageId: current.id,
    stageSince: String(o.stageSince ?? o.createdAt),
    createdAt: String(o.createdAt),
    customer: customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone } : null,
    owner: o.ownerId ? { id: o.ownerId, name: people.get(o.ownerId) ?? "Integrante" } : null,
    order: order ? { id: order.id, number: order.number, total: toNumber(order.total), paid: Boolean(order.paidAt) || order.status === "PAID" } : null,
    stages,
    activities: tasks
      .filter((t) => t.dueAt || t.dueDay)
      .map((t) => ({
        id: t.id,
        kind: isActivityKind(t.kind) ? t.kind : "OTHER",
        title: t.title,
        dueAt: t.dueAt ? String(t.dueAt) : `${t.dueDay}T22:00:00.000Z`,
        assigneeId: t.assigneeId,
        assignee: t.assigneeId ? (people.get(t.assigneeId) ?? null) : null,
        done: t.status === "DONE",
      }))
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    events: events.map((e) => ({ id: e.id, kind: e.kind, data: (e.data as Record<string, unknown> | null) ?? null, author: e.authorId ? (people.get(e.authorId) ?? null) : null, at: String(e.createdAt) })),
    team: team.filter((u) => u.active).map((u) => ({ id: u.id, name: nameOf(u) })),
    reasons: reasons.map((r) => ({ id: r.id, name: r.name })),
    files: files.map((f) => ({ id: f.id, name: f.fileName, at: String(f.createdAt) })),
  };
}

/** Posición de la oportunidad en el tablero filtrado (mismo orden de columnas y tarjetas) para el paginador «‹ 1 / N ›». */
export async function opportunityNeighbors(tenantId: string, id: string, filters: PipelineFilters) {
  const board = await loadPipeline(tenantId, filters);
  const ordered = board.stages.flatMap((s) => board.cards.filter((c) => c.stageId === s.id)).map((c) => c.id);
  const index = ordered.indexOf(id);
  if (index === -1) return null;
  return { index: index + 1, total: ordered.length, prev: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null };
}

/** Actividades pendientes del CRM (con su oportunidad), de lo vencido a lo más lejano: vista «Actividades» del tablero. */
export async function pendingCrmActivities(tenantId: string, opportunityIds?: string[]) {
  const tasks = await db.orm.public.Task.where({ tenantId, status: "OPEN" }).where((t) => t.opportunityId.isNotNull()).limit(500).all();
  const list = opportunityIds ? tasks.filter((t) => t.opportunityId && opportunityIds.includes(t.opportunityId)) : tasks;
  const oppIds = [...new Set(list.map((t) => t.opportunityId!))];
  const opps = oppIds.length ? await db.orm.public.Opportunity.where({ tenantId }).where((o) => o.id.in(oppIds)).select("id", "interest").all() : [];
  const names = new Map(opps.map((o) => [o.id, o.interest]));
  return list
    .map((t) => ({ id: t.id, kind: (isActivityKind(t.kind) ? t.kind : "OTHER") as ActivityKind, title: t.title, dueAt: t.dueAt ? String(t.dueAt) : t.dueDay ? `${t.dueDay}T22:00:00.000Z` : "", opportunityId: t.opportunityId!, opportunity: names.get(t.opportunityId!) ?? "Oportunidad", assigneeId: t.assigneeId }))
    .filter((t) => t.dueAt)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export type CrmReports = {
  funnel: { stage: string; count: number; value: number }[];
  closed: { won: { count: number; value: number }; lost: { count: number; value: number }; reasons: { reason: string; count: number }[] };
  forecast: { month: string; weighted: number; total: number }[];
  byOwner: { owner: string; open: number; done: number; overdue: number }[];
};

/** Informes: embudo por etapa, ganadas y perdidas (con motivos), previsión por mes de cierre (valor × probabilidad) y actividad por responsable. */
export async function crmReports(tenantId: string): Promise<CrmReports> {
  const board = await loadPipeline(tenantId);
  const [all, tasks, team] = await Promise.all([
    db.orm.public.Opportunity.where({ tenantId }).where((o) => o.status.in(["WON", "LOST"])).select("status", "estimatedValue", "lostReason").limit(5000).all(),
    db.orm.public.Task.where({ tenantId }).where((t) => t.opportunityId.isNotNull()).select("status", "assigneeId", "dueAt", "dueDay").limit(5000).all(),
    db.orm.public.User.where({ tenantId }).select("id", "name", "email").all(),
  ]);
  const value = (v: unknown) => (v == null ? 0 : toNumber(v as never));
  const won = all.filter((o) => o.status === "WON");
  const lost = all.filter((o) => o.status === "LOST");
  const reasons = new Map<string, number>();
  for (const o of lost) {
    const r = (o.lostReason ?? "Sin motivo").split(" · ")[0]!;
    reasons.set(r, (reasons.get(r) ?? 0) + 1);
  }
  const months = new Map<string, { weighted: number; total: number }>();
  for (const c of board.cards.filter((c) => !c.won && c.expectedClose)) {
    const key = c.expectedClose!.slice(0, 7);
    const m = months.get(key) ?? { weighted: 0, total: 0 };
    m.weighted += (c.value * c.probability) / 100;
    m.total += c.value;
    months.set(key, m);
  }
  const people = new Map(team.map((u) => [u.id, nameOf(u)]));
  const owners = new Map<string, { open: number; done: number; overdue: number }>();
  for (const t of tasks) {
    const who = t.assigneeId ? (people.get(t.assigneeId) ?? "Integrante") : "Sin asignar";
    const row = owners.get(who) ?? { open: 0, done: 0, overdue: 0 };
    if (t.status === "DONE") row.done++;
    else {
      row.open++;
      const due = t.dueAt ? new Date(String(t.dueAt)).getTime() : t.dueDay ? Date.parse(`${t.dueDay}T22:00:00Z`) : null;
      if (due != null && activityState(due) === "overdue") row.overdue++;
    }
    owners.set(who, row);
  }
  return {
    funnel: board.stages.filter((s) => !s.isWon).map((s) => {
      const cards = board.cards.filter((c) => c.stageId === s.id);
      return { stage: s.name, count: cards.length, value: cards.reduce((t, c) => t + c.value, 0) };
    }),
    closed: {
      won: { count: won.length, value: won.reduce((t, o) => t + value(o.estimatedValue), 0) },
      lost: { count: lost.length, value: lost.reduce((t, o) => t + value(o.estimatedValue), 0) },
      reasons: [...reasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    },
    forecast: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, m]) => ({ month, weighted: Math.round(m.weighted), total: Math.round(m.total) })),
    byOwner: [...owners.entries()].map(([owner, r]) => ({ owner, ...r })).sort((a, b) => b.open - a.open),
  };
}

/** Oportunidades de un cliente (botón de resumen de la Ficha del cliente). */
export async function customerOpportunityCount(tenantId: string, customerId: string): Promise<number> {
  const r = await db.orm.public.Opportunity.where({ tenantId, customerId }).where((o) => o.status.in(["OPEN", "WON"])).aggregate((a) => ({ n: a.count() }));
  return Number(r.n ?? 0);
}

/** Lo del CRM que muestra Inicio: llamadas y reuniones de hoy, actividades vencidas y oportunidades abiertas sin actividad. */
export async function crmHomeSignals(tenantId: string) {
  const [open, tasks] = await Promise.all([
    db.orm.public.Opportunity.where({ tenantId, status: "OPEN" }).select("id").limit(2000).all(),
    db.orm.public.Task.where({ tenantId, status: "OPEN" }).where((t) => t.opportunityId.isNotNull()).select("id", "kind", "title", "dueAt", "dueDay", "opportunityId").limit(2000).all(),
  ]);
  const today = bogotaDay(Date.now());
  const withActivity = new Set(tasks.map((t) => t.opportunityId));
  const dueMs = (t: { dueAt: unknown; dueDay: string | null }) => (t.dueAt ? new Date(String(t.dueAt)).getTime() : t.dueDay ? Date.parse(`${t.dueDay}T22:00:00Z`) : null);
  const todays = tasks
    .filter((t) => (t.kind === "CALL" || t.kind === "MEETING") && dueMs(t) != null && bogotaDay(dueMs(t)!) === today)
    .sort((a, b) => (dueMs(a) ?? 0) - (dueMs(b) ?? 0))
    .map((t) => ({ id: t.id, label: `${ACTIVITY_LABEL[t.kind as ActivityKind]} · ${t.title}`, at: new Date(dueMs(t)!).toISOString(), opportunityId: t.opportunityId! }));
  return {
    today: todays,
    overdue: tasks.filter((t) => dueMs(t) != null && activityState(dueMs(t)!) === "overdue").length,
    withoutActivity: open.filter((o) => !withActivity.has(o.id)).length,
  };
}

/** Búsqueda de oportunidades por nombre o cliente (Ctrl K). */
export async function searchOpportunities(tenantId: string, q: string) {
  const text = q.trim().slice(0, 60);
  if (text.length < 2) return [];
  const pattern = `%${escapeLike(text)}%`;
  const byName = await db.orm.public.Opportunity.where({ tenantId }).where((o) => o.interest.ilike(pattern)).limit(5).select("id", "interest", "customerId", "status").all();
  const customers = await db.orm.public.Customer.where({ tenantId }).where((c) => c.name.ilike(pattern)).limit(5).select("id").all();
  const byCustomer = customers.length ? await db.orm.public.Opportunity.where({ tenantId }).where((o) => o.customerId.in(customers.map((c) => c.id))).limit(5).select("id", "interest", "customerId", "status").all() : [];
  const seen = new Set<string>();
  const rows = [...byName, ...byCustomer].filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true))).slice(0, 6);
  const ids = [...new Set(rows.map((r) => r.customerId).filter((x): x is string => Boolean(x)))];
  const names = ids.length ? new Map((await db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(ids)).select("id", "name").all()).map((c) => [c.id, c.name])) : new Map<string, string>();
  const status: Record<string, string> = { OPEN: "Abierta", WON: "Ganada", LOST: "Perdida" };
  return rows.map((o) => ({ id: o.id, title: o.interest, subtitle: [o.customerId ? names.get(o.customerId) : null, status[o.status]].filter(Boolean).join(" · ") }));
}

/** Nombre de un cliente del negocio (chip del filtro por cliente). */
export async function customerNameOf(tenantId: string, customerId: string): Promise<string | null> {
  return (await db.orm.public.Customer.where({ tenantId, id: customerId }).select("name").first())?.name ?? null;
}
