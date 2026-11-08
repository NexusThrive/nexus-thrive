import { toNumber } from "@/lib/foundation/format";
import { canonicalPhone } from "@/lib/foundation/kernel/phone";
import type { DbTransaction } from "@/lib/foundation/db/db-transaction";
import { emitEvent } from "@/lib/core/events/outbox";
import { findOrCreateContact } from "@/lib/business/customers/contacts-db";
import { openObligation } from "@/lib/business/sales/obligations";
import { db } from "@/prisma/db";
import { createOpportunity, loseOpportunity, winOpportunity } from "./opportunities-db";
import { validateLoss } from "./opportunities";
import { ACTIVITY_LABEL, DEFAULT_LOST_REASONS, DEFAULT_STAGES, LEGACY_STAGE_INDEX, bogotaDay, isActivityKind, parseMoney, sortCards, validateQuick, type ActivityKind } from "./pipeline";

/**
 * Pipeline del CRM (pantallas 8 y 9). Todo por `tenantId`. Reutiliza el repositorio de oportunidades (crear, ganar, perder) y las
 * tareas (`Task`) como actividades, con `kind` y `dueAt`: lo que se programa aquí también aparece en Tareas. Como en Odoo
 * (`crm.lead`), la oportunidad apunta al cliente y lee su correo y teléfono; editarlos desde el CRM los actualiza en el cliente.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };
const now = () => Temporal.Instant.fromEpochMilliseconds(Date.now());

export type PipelineStage = { id: string; name: string; position: number; probability: number; isWon: boolean };
export type NextActivity = { id: string; kind: ActivityKind; title: string; dueAt: string; assigneeId: string | null };
export type PipelineCard = {
  id: string;
  name: string;
  value: number;
  probability: number;
  stageId: string;
  customer: { id: string; name: string } | null;
  tags: string[];
  priority: number;
  owner: { id: string; name: string } | null;
  next: NextActivity | null;
  won: boolean;
  orderId: string | null;
  /** `null` sin pedido; `false` con pedido sin cobrar; `true` cobrado. */
  orderPaid: boolean | null;
  position: number | null;
  expectedClose: string | null;
  createdAt: string;
};
export type PipelineFilters = { me?: string | null; mine?: boolean; q?: string; ownerId?: string; tag?: string; priority?: number; closeFrom?: string; closeTo?: string; valueMin?: number; valueMax?: number; customerId?: string };
export type Pipeline = {
  stages: PipelineStage[];
  cards: PipelineCard[];
  lost: { count: number; total: number };
  owners: { id: string; name: string }[];
  tags: string[];
  reasons: { id: string; name: string }[];
};

/** Etapas del negocio en orden; si aún no tiene, crea las iniciales (y los motivos de pérdida de partida). */
export async function ensureStages(tenantId: string): Promise<PipelineStage[]> {
  const rows = await db.orm.public.CrmStage.where({ tenantId }).orderBy((s) => s.position.asc()).all();
  if (rows.length) {
    // Dos cargas a la vez en un negocio nuevo podían crear las etapas iniciales dos veces: se conserva la primera de cada nombre
    // (y una sola ganada), sus oportunidades pasan a ella y las repetidas se borran.
    const sorted = [...rows].sort((a, b) => a.position - b.position || String(a.createdAt).localeCompare(String(b.createdAt)));
    const keep = new Map<string, string>();
    const dupes: { id: string; keepId: string }[] = [];
    for (const s of sorted) {
      const key = s.isWon ? "\u0000won" : s.name.trim().toLocaleLowerCase("es");
      const kept = keep.get(key);
      if (kept) dupes.push({ id: s.id, keepId: kept });
      else keep.set(key, s.id);
    }
    if (dupes.length) {
      await db.transaction(async (tx) => {
        for (const d of dupes) {
          await tx.orm.public.Opportunity.where({ tenantId, stageId: d.id }).update({ stageId: d.keepId });
          await tx.orm.public.CrmStage.where({ tenantId, id: d.id }).deleteAll();
        }
        const left = await tx.orm.public.CrmStage.where({ tenantId }).orderBy((s) => s.position.asc()).all();
        const ordered = [...left.filter((s) => !s.isWon), ...left.filter((s) => s.isWon)];
        for (const [i, s] of ordered.entries()) if (s.position !== i) await tx.orm.public.CrmStage.where({ tenantId, id: s.id }).update({ position: i });
      });
      return ensureStages(tenantId);
    }
    return rows.map((s) => ({ id: s.id, name: s.name, position: s.position, probability: s.probability, isWon: s.isWon }));
  }
  await db.transaction(async (tx) => {
    if (await tx.orm.public.CrmStage.where({ tenantId }).select("id").first()) return;
    await tx.orm.public.CrmStage.createAll(DEFAULT_STAGES.map((s, i) => ({ tenantId, name: s.name, position: i, probability: s.probability, isWon: s.isWon }))).toArray();
    if (!(await tx.orm.public.CrmLostReason.where({ tenantId }).select("id").first())) {
      await tx.orm.public.CrmLostReason.createAll(DEFAULT_LOST_REASONS.map((name, i) => ({ tenantId, name, position: i }))).toArray();
    }
  });
  return ensureStages(tenantId);
}

/** Etapa en la que se ve una oportunidad: la suya; si es anterior al pipeline configurable, la equivalente por `stage`. */
function stageOf(o: { stageId: string | null; stage: string; status: string }, stages: PipelineStage[]): PipelineStage {
  const own = o.stageId ? stages.find((s) => s.id === o.stageId) : undefined;
  if (own) return own;
  if (o.status === "WON") return stages.find((s) => s.isWon) ?? stages.at(-1)!;
  const open = stages.filter((s) => !s.isWon);
  return open[Math.min(LEGACY_STAGE_INDEX[o.stage] ?? 0, open.length - 1)] ?? stages[0]!;
}

const dueOf = (t: { dueAt: unknown; dueDay: string | null }) => (t.dueAt ? String(t.dueAt) : t.dueDay ? `${t.dueDay}T22:00:00.000Z` : null);

/** Próxima actividad pendiente de cada oportunidad (la de fecha más cercana). */
async function nextActivities(tenantId: string, ids: string[]): Promise<Map<string, NextActivity>> {
  const map = new Map<string, NextActivity>();
  if (!ids.length) return map;
  const tasks = await db.orm.public.Task.where({ tenantId, status: "OPEN" }).where((t) => t.opportunityId.in(ids)).limit(2000).all();
  for (const t of tasks) {
    const due = dueOf(t);
    if (!t.opportunityId || !due) continue;
    const prev = map.get(t.opportunityId);
    if (!prev || due < prev.dueAt) map.set(t.opportunityId, { id: t.id, kind: isActivityKind(t.kind) ? t.kind : "OTHER", title: t.title, dueAt: due, assigneeId: t.assigneeId });
  }
  return map;
}

/** El tablero: etapas, tarjetas abiertas y ganadas (con filtros), resumen de perdidas, responsables, etiquetas y motivos. */
export async function loadPipeline(tenantId: string, filters: PipelineFilters = {}): Promise<Pipeline> {
  const stages = await ensureStages(tenantId);
  const [rows, lostRows, team, tagRows, reasons] = await Promise.all([
    db.orm.public.Opportunity.where({ tenantId }).where((o) => o.status.in(["OPEN", "WON"])).orderBy((o) => o.createdAt.desc()).limit(500).all(),
    db.orm.public.Opportunity.where({ tenantId, status: "LOST" }).select("estimatedValue").limit(5000).all(),
    db.orm.public.User.where({ tenantId, active: true }).select("id", "name", "email").all(),
    db.orm.public.CrmTag.where({ tenantId }).orderBy((t) => t.name.asc()).select("name").all(),
    db.orm.public.CrmLostReason.where({ tenantId }).orderBy((r) => r.position.asc()).select("id", "name").all(),
  ]);
  const customerIds = [...new Set(rows.map((r) => r.customerId).filter((id): id is string => Boolean(id)))];
  const orderIds = rows.map((r) => r.orderId).filter((id): id is string => Boolean(id));
  const [customers, orders, next] = await Promise.all([
    customerIds.length ? db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(customerIds)).select("id", "name").all() : [],
    orderIds.length ? db.orm.public.StoreOrder.where({ tenantId }).where((o) => o.id.in(orderIds)).select("id", "paidAt", "status").all() : [],
    nextActivities(tenantId, rows.map((r) => r.id)),
  ]);
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const nameOf = (u: { name: string | null; email: string | null }) => u.name?.trim() || u.email?.split("@")[0] || "Integrante";
  const owners = new Map(team.map((u) => [u.id, nameOf(u)]));
  const paid = new Map(orders.map((o) => [o.id, Boolean(o.paidAt) || o.status === "PAID"]));

  let cards: PipelineCard[] = rows.map((o) => {
    const stage = stageOf(o, stages);
    return {
      id: o.id,
      name: o.interest,
      value: o.estimatedValue == null ? 0 : toNumber(o.estimatedValue),
      probability: o.status === "WON" ? 100 : (o.probability ?? stage.probability),
      stageId: stage.id,
      customer: o.customerId ? { id: o.customerId, name: names.get(o.customerId) ?? "Contacto" } : null,
      tags: [...(o.tags ?? [])],
      priority: o.priority ?? 0,
      owner: o.ownerId ? { id: o.ownerId, name: owners.get(o.ownerId) ?? "Integrante" } : null,
      next: o.status === "OPEN" ? (next.get(o.id) ?? null) : null,
      won: o.status === "WON",
      orderId: o.orderId,
      orderPaid: o.orderId ? (paid.get(o.orderId) ?? false) : null,
      position: o.position ?? null,
      expectedClose: o.expectedClose ?? null,
      createdAt: String(o.createdAt),
    };
  });

  const q = filters.q?.trim().toLocaleLowerCase("es");
  if (filters.mine && filters.me) cards = cards.filter((c) => !c.owner || c.owner.id === filters.me);
  if (q) cards = cards.filter((c) => [c.name, c.customer?.name ?? "", c.owner?.name ?? "", ...c.tags].some((t) => t.toLocaleLowerCase("es").includes(q)));
  if (filters.ownerId) cards = cards.filter((c) => c.owner?.id === filters.ownerId);
  if (filters.tag) cards = cards.filter((c) => c.tags.includes(filters.tag!));
  if (filters.priority != null) cards = cards.filter((c) => c.priority >= filters.priority!);
  if (filters.closeFrom) cards = cards.filter((c) => c.expectedClose != null && c.expectedClose >= filters.closeFrom!);
  if (filters.closeTo) cards = cards.filter((c) => c.expectedClose != null && c.expectedClose <= filters.closeTo!);
  if (filters.valueMin != null) cards = cards.filter((c) => c.value >= filters.valueMin!);
  if (filters.valueMax != null) cards = cards.filter((c) => c.value <= filters.valueMax!);
  if (filters.customerId) cards = cards.filter((c) => c.customer?.id === filters.customerId);

  const usedTags = new Set(rows.flatMap((r) => r.tags ?? []));
  for (const t of tagRows) usedTags.add(t.name);
  return {
    stages,
    cards: sortCards(cards),
    lost: { count: lostRows.length, total: Math.round(lostRows.reduce((s, r) => s + (r.estimatedValue == null ? 0 : toNumber(r.estimatedValue)), 0)) },
    owners: team.map((u) => ({ id: u.id, name: nameOf(u) })),
    tags: [...usedTags].sort((a, b) => a.localeCompare(b, "es")),
    reasons: reasons.map((r) => ({ id: r.id, name: r.name })),
  };
}

/** Registra un evento del historial de la oportunidad. */
async function logEvent(tx: Pick<DbTransaction, "orm">, tenantId: string, opportunityId: string, kind: string, authorId: string | null, data?: Record<string, unknown>) {
  await tx.orm.public.OpportunityEvent.create({ tenantId, opportunityId, kind, authorId, data: (data ?? null) as never });
}

/** Instante de hoy a las 5 p. m. en Bogotá (hora por defecto de una actividad nueva). */
const todayAt5 = () => Temporal.Instant.from(`${bogotaDay(Date.now())}T22:00:00Z`);

export type QuickInput = {
  stageId?: string | null;
  name: string;
  /** Cliente existente elegido en el buscador. */
  customerId?: string | null;
  /** «Crear «texto» como cliente nuevo». */
  newCustomerName?: string | null;
  email?: string;
  phone?: string;
  value?: string;
  priority?: number;
  activity?: ActivityKind | "NONE";
};

/**
 * Creación rápida: con un cliente existente, la oportunidad queda ligada a él (y el correo o teléfono escritos se guardan en el cliente);
 * con «Crear», se busca primero por teléfono o correo (no se duplica a la persona) y si no existe se crea. Sin contacto también vale.
 */
export async function createQuickOpportunity(tenantId: string, userId: string | null, input: QuickInput): Promise<Result<{ id: string; customerId: string | null }>> {
  const errors = validateQuick({ name: input.name, value: input.value ?? "", email: input.email ?? "", phone: input.phone ?? "" });
  const first = Object.values(errors)[0];
  if (first) return { ok: false, message: first };
  const stages = await ensureStages(tenantId);
  const stage = stages.find((s) => s.id === input.stageId && !s.isWon) ?? stages.find((s) => !s.isWon)!;
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;
  return db.transaction(async (tx) => {
    let customerId: string | null = null;
    if (input.customerId) {
      const c = await tx.orm.public.Customer.where({ tenantId, id: input.customerId }).select("id", "email", "phone").first();
      if (!c) return { ok: false as const, message: "Ese cliente ya no existe." };
      customerId = c.id;
      // Como en Odoo (_inverse_email_from / _inverse_phone): lo que se escribe aquí queda en el cliente.
      const patch = { ...(email && email !== c.email ? { email } : {}), ...(phone && phone !== c.phone ? { phone: phone.slice(0, 30), phoneNorm: canonicalPhone(phone) || null } : {}) };
      if (Object.keys(patch).length) await tx.orm.public.Customer.where({ tenantId, id: c.id }).update(patch);
    } else if (input.newCustomerName?.trim()) {
      const contact = await findOrCreateContact(tx, tenantId, { name: input.newCustomerName, phone, email, source: "MANUAL", stage: "PROSPECT" });
      if (!contact) return { ok: false as const, message: "Llegaste al límite de clientes de tu plan." };
      customerId = contact.id;
    }
    const created = await createOpportunity(tx, tenantId, { customerId, interest: input.name, estimatedValue: parseMoney(input.value ?? ""), ownerId: userId, source: "CRM" });
    if (!created.ok) return created;
    const { id } = created;
    // La nueva queda arriba de su columna: una posición antes de la primera con orden manual (o 0 si no hay).
    const top = await tx.orm.public.Opportunity.where({ tenantId, stageId: stage.id, status: "OPEN" }).where((o) => o.position.isNotNull()).orderBy((o) => o.position.asc()).select("position").first();
    await tx.orm.public.Opportunity.where({ tenantId, id }).update({ stageId: stage.id, probability: stage.probability, priority: Math.max(0, Math.min(3, input.priority ?? 0)), stageSince: now(), position: (top?.position ?? 1) - 1 });
    await logEvent(tx, tenantId, id, "CREATED", userId, { stage: stage.name });
    if (input.activity && input.activity !== "NONE") {
      await tx.orm.public.Task.create({ tenantId, title: ACTIVITY_LABEL[input.activity], kind: input.activity, dueAt: todayAt5(), dueDay: bogotaDay(Date.now()), assigneeId: userId, customerId, opportunityId: id, createdById: userId });
    }
    return { ok: true as const, id, customerId };
  });
}

/** Mueve la oportunidad a otra etapa: toma la probabilidad de la etapa, registra el cambio y, si es la ganada, la gana. */
export async function moveToStage(tenantId: string, id: string, stageId: string, userId: string | null): Promise<Result<{ won?: boolean; orderId?: string | null }>> {
  const stages = await ensureStages(tenantId);
  const target = stages.find((s) => s.id === stageId);
  if (!target) return { ok: false, message: "Esa etapa no existe." };
  const o = await db.orm.public.Opportunity.where({ tenantId, id }).first();
  if (!o) return { ok: false, message: "La oportunidad no existe." };
  if (o.status === "LOST") return { ok: false, message: "Está perdida: reábrela primero." };
  if (target.isWon) return winWithOrder(tenantId, id, userId);
  const from = stageOf(o, stages);
  if (from.id === target.id) return { ok: true };
  if (o.status === "WON") {
    // Sacarla de Ganado la reabre en la etapa elegida (como en Odoo): toma su probabilidad y conserva el pedido que ya se creó.
    await db.transaction(async (tx) => {
      await tx.orm.public.Opportunity.where({ tenantId, id }).update({ status: "OPEN", closedAt: null, stageId: target.id, probability: target.probability, stageSince: now(), position: null });
      await logEvent(tx, tenantId, id, "STAGE", userId, { from: from.name, to: target.name, reopened: true });
    });
    return { ok: true };
  }
  await db.transaction(async (tx) => {
    await tx.orm.public.Opportunity.where({ tenantId, id }).update({ stageId: target.id, probability: target.probability, stageSince: now(), position: null });
    await logEvent(tx, tenantId, id, "STAGE", userId, { from: from.name, to: target.name });
  });
  return { ok: true };
}

/**
 * Gana la oportunidad: queda en la etapa ganada con 100 %, el contacto pasa a cliente, se crea el pedido en Ventas y cobros con el
 * cliente y el valor (enlazado de vuelta en `origin`) y su cobro queda abierto en la cartera. Se registra en el historial. Si ya
 * tenía pedido (se ganó, se reabrió y se vuelve a ganar), se reutiliza.
 */
export async function winWithOrder(tenantId: string, id: string, userId: string | null): Promise<Result<{ won: boolean; orderId: string | null }>> {
  const stages = await ensureStages(tenantId);
  const wonStage = stages.find((s) => s.isWon) ?? stages.at(-1)!;
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const o = await tx.orm.public.Opportunity.where({ tenantId, id }).first();
        if (!o || o.status !== "OPEN") return { ok: false as const, message: "La oportunidad ya está cerrada o no existe." };
        const value = o.estimatedValue == null ? 0 : toNumber(o.estimatedValue);
        // Si ya se ganó antes (y se reabrió), se reutiliza su pedido: no se crea otro.
        let orderId: string | null = o.orderId ?? null;
        if (!orderId && value > 0) {
          const customer = o.customerId ? await tx.orm.public.Customer.where({ tenantId, id: o.customerId }).select("name", "phone", "email", "city").first() : null;
          const last = await tx.orm.public.StoreOrder.where({ tenantId }).orderBy((x) => x.number.desc()).first();
          const order = await tx.orm.public.StoreOrder.create({
            tenantId,
            number: (last?.number ?? 0) + 1,
            customerId: o.customerId,
            customerName: (customer?.name ?? "Cliente").slice(0, 120),
            phone: (customer?.phone ?? "").slice(0, 30),
            email: customer?.email ?? null,
            city: customer?.city ?? null,
            notes: `Oportunidad: ${o.interest}`.slice(0, 500),
            total: value.toFixed(2),
            origin: { type: "opportunity", opportunityId: id, name: o.interest } as never,
          });
          orderId = order.id;
          await tx.orm.public.OrderStatusChange.create({ tenantId, orderId: order.id, fromStatus: null, toStatus: "RECEIVED", note: `Nació de la oportunidad «${o.interest}»`.slice(0, 300) });
          await openObligation(tx, tenantId, { originType: "STORE_ORDER", originId: order.id, customerId: o.customerId, debtorName: customer?.name ?? "Cliente", description: `Pedido · ${o.interest}`.slice(0, 200), amount: value, dueDate: Temporal.Instant.fromEpochMilliseconds(Date.now() + 3 * 86_400_000) });
          await emitEvent(tx, tenantId, { type: "order.created", resourceType: "store_order", resourceId: order.id, payload: { order_id: order.id, code: `T-${String(order.number).padStart(4, "0")}`, total: value, currency: "COP", opportunity_id: id } });
        }
        const won = await winOpportunity(tx, tenantId, id, orderId);
        if (!won.ok) return won;
        await tx.orm.public.Opportunity.where({ tenantId, id }).update({ stageId: wonStage.id, probability: 100, stageSince: now() });
        await tx.orm.public.Task.where({ tenantId, opportunityId: id, status: "OPEN" }).update({ status: "DONE", doneAt: now(), doneById: userId });
        await logEvent(tx, tenantId, id, "WON", userId, { orderId });
        return { ok: true as const, won: true, orderId };
      });
    } catch (e) {
      if (attempt < 4 && /StoreOrder_tenantId_number|unique|duplicate/i.test(String((e as Error)?.message ?? e))) continue;
      throw e;
    }
  }
}

/** Pierde la oportunidad con un motivo de la lista (y texto libre opcional): queda en Perdidos con 0 %. */
export async function loseWithReason(tenantId: string, id: string, reasonId: string | null, note: string, userId: string | null): Promise<Result> {
  const reason = reasonId ? await db.orm.public.CrmLostReason.where({ tenantId, id: reasonId }).select("name").first() : null;
  const text = [reason?.name, note.trim()].filter(Boolean).join(" · ");
  const problem = validateLoss(text);
  if (problem) return { ok: false, message: "Elige un motivo o escribe por qué se perdió." };
  const r = await loseOpportunity(tenantId, id, text);
  if (!r.ok) return r;
  await db.transaction(async (tx) => {
    await tx.orm.public.Opportunity.where({ tenantId, id }).update({ probability: 0 });
    await logEvent(tx, tenantId, id, "LOST", userId, { reason: text });
  });
  return { ok: true };
}

/** Reabre una oportunidad perdida (como `action_restore` de Odoo): vuelve a su etapa con la probabilidad de esa etapa. */
export async function reopenOpportunity(tenantId: string, id: string, userId: string | null): Promise<Result> {
  const stages = await ensureStages(tenantId);
  const o = await db.orm.public.Opportunity.where({ tenantId, id }).first();
  if (!o || o.status !== "LOST") return { ok: false, message: "Esa oportunidad no está perdida." };
  const stage = stageOf({ ...o, status: "OPEN" }, stages);
  const target = stage.isWon ? stages.find((s) => !s.isWon)! : stage;
  await db.transaction(async (tx) => {
    await tx.orm.public.Opportunity.where({ tenantId, id }).update({ status: "OPEN", lostReason: null, closedAt: null, stageId: target.id, probability: target.probability, stageSince: now() });
    await logEvent(tx, tenantId, id, "REOPENED", userId, { stage: target.name });
  });
  return { ok: true };
}

/** Orden manual dentro de una columna: las ids en el orden en que quedaron. */
export async function reorderColumn(tenantId: string, orderedIds: string[]): Promise<Result> {
  const ids = orderedIds.slice(0, 300);
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.orm.public.Opportunity.where({ tenantId, id }).update({ position: i + 1 });
  });
  return { ok: true };
}

export type OpportunityPatch = Partial<{ name: string; value: number | null; probability: number; expectedClose: string | null; priority: number; tags: string[]; description: string | null; source: string | null; ownerId: string | null; email: string | null; phone: string | null }>;

const FIELD_LABEL: Record<string, string> = { name: "nombre", value: "valor", probability: "probabilidad", expectedClose: "cierre previsto", priority: "prioridad", tags: "etiquetas", source: "origen", ownerId: "responsable" };

/** Edición en línea del detalle. Correo y teléfono se guardan en el cliente (no se duplican en la oportunidad). */
export async function updateOpportunity(tenantId: string, id: string, patch: OpportunityPatch, userId: string | null): Promise<Result> {
  const o = await db.orm.public.Opportunity.where({ tenantId, id }).first();
  if (!o) return { ok: false, message: "La oportunidad no existe." };
  if (patch.name !== undefined && patch.name.trim().length < 2) return { ok: false, message: "Escribe el nombre de la oportunidad." };
  if (patch.value != null && (!Number.isFinite(patch.value) || patch.value < 0)) return { ok: false, message: "El valor no es válido." };
  if (patch.probability !== undefined && (patch.probability < 0 || patch.probability > 100)) return { ok: false, message: "La probabilidad va de 0 a 100." };
  if (patch.expectedClose && !/^\d{4}-\d{2}-\d{2}$/.test(patch.expectedClose)) return { ok: false, message: "La fecha no es válida." };
  if (patch.ownerId && !(await db.orm.public.User.where({ tenantId, id: patch.ownerId, active: true }).select("id").first())) return { ok: false, message: "Esa persona no es del equipo." };
  const update = {
    ...(patch.name !== undefined ? { interest: patch.name.trim().slice(0, 200) } : {}),
    ...(patch.value !== undefined ? { estimatedValue: patch.value == null ? null : patch.value.toFixed(2) } : {}),
    ...(patch.probability !== undefined ? { probability: Math.round(patch.probability) } : {}),
    ...(patch.expectedClose !== undefined ? { expectedClose: patch.expectedClose } : {}),
    ...(patch.priority !== undefined ? { priority: Math.max(0, Math.min(3, Math.round(patch.priority))) } : {}),
    ...(patch.tags !== undefined ? { tags: [...new Set(patch.tags.map((t) => t.trim().slice(0, 40)).filter(Boolean))].slice(0, 12) } : {}),
    ...(patch.description !== undefined ? { description: patch.description?.slice(0, 5000) ?? null } : {}),
    ...(patch.source !== undefined ? { source: patch.source?.trim().slice(0, 60) || null } : {}),
    ...(patch.ownerId !== undefined ? { ownerId: patch.ownerId } : {}),
  };
  await db.transaction(async (tx) => {
    if (Object.keys(update).length) await tx.orm.public.Opportunity.where({ tenantId, id }).update(update);
    if (o.customerId && (patch.email !== undefined || patch.phone !== undefined)) {
      await tx.orm.public.Customer.where({ tenantId, id: o.customerId }).update({
        ...(patch.email !== undefined ? { email: patch.email?.trim().toLowerCase() || null } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone?.trim().slice(0, 30) || null, phoneNorm: canonicalPhone(patch.phone ?? "") || null } : {}),
      });
    }
    // Las etiquetas nuevas quedan en la lista del CRM (Configuración › Etiquetas).
    for (const name of update.tags ?? []) {
      if (!(await tx.orm.public.CrmTag.where({ tenantId, name }).select("id").first())) await tx.orm.public.CrmTag.create({ tenantId, name });
    }
    const changed = Object.keys(patch).filter((k) => FIELD_LABEL[k] && k !== "description");
    if (changed.length) await logEvent(tx, tenantId, id, "FIELD", userId, { fields: changed.map((k) => FIELD_LABEL[k]) });
  });
  return { ok: true };
}

/** Programa una actividad de la oportunidad (es una tarea: también se ve en Tareas). */
export async function scheduleActivity(tenantId: string, opportunityId: string, input: { kind: ActivityKind; title?: string; dueAt: string; assigneeId?: string | null }, userId: string | null): Promise<Result<{ id: string }>> {
  if (!isActivityKind(input.kind)) return { ok: false, message: "Elige el tipo de actividad." };
  const due = Date.parse(input.dueAt);
  if (!Number.isFinite(due)) return { ok: false, message: "Elige la fecha y la hora." };
  const o = await db.orm.public.Opportunity.where({ tenantId, id: opportunityId }).select("id", "customerId", "ownerId").first();
  if (!o) return { ok: false, message: "La oportunidad no existe." };
  const title = (input.title?.trim() || ACTIVITY_LABEL[input.kind]).slice(0, 200);
  const created = await db.transaction(async (tx) => {
    const t = await tx.orm.public.Task.create({ tenantId, title, kind: input.kind, dueAt: Temporal.Instant.fromEpochMilliseconds(due), dueDay: bogotaDay(due), assigneeId: input.assigneeId ?? o.ownerId ?? userId, customerId: o.customerId, opportunityId, createdById: userId });
    await logEvent(tx, tenantId, opportunityId, "ACTIVITY", userId, { action: "scheduled", kind: input.kind, title, dueAt: new Date(due).toISOString() });
    return t;
  });
  return { ok: true, id: created.id };
}

/** Marca hecha una actividad (de cualquier oportunidad del negocio). */
export async function completeActivity(tenantId: string, taskId: string, userId: string | null): Promise<Result<{ opportunityId: string | null }>> {
  const t = await db.orm.public.Task.where({ tenantId, id: taskId }).first();
  if (!t || t.status !== "OPEN") return { ok: false, message: "Esa actividad ya está hecha o no existe." };
  await db.transaction(async (tx) => {
    await tx.orm.public.Task.where({ tenantId, id: taskId }).update({ status: "DONE", doneAt: now(), doneById: userId });
    if (t.opportunityId) await logEvent(tx, tenantId, t.opportunityId, "ACTIVITY", userId, { action: "done", kind: t.kind, title: t.title });
  });
  return { ok: true, opportunityId: t.opportunityId };
}

/** Cambia la fecha y hora de una actividad pendiente. */
export async function rescheduleActivity(tenantId: string, taskId: string, dueAt: string, userId: string | null): Promise<Result> {
  const due = Date.parse(dueAt);
  if (!Number.isFinite(due)) return { ok: false, message: "Elige la fecha y la hora." };
  const t = await db.orm.public.Task.where({ tenantId, id: taskId, status: "OPEN" }).first();
  if (!t) return { ok: false, message: "Esa actividad ya está hecha o no existe." };
  await db.transaction(async (tx) => {
    await tx.orm.public.Task.where({ tenantId, id: taskId }).update({ dueAt: Temporal.Instant.fromEpochMilliseconds(due), dueDay: bogotaDay(due) });
    if (t.opportunityId) await logEvent(tx, tenantId, t.opportunityId, "ACTIVITY", userId, { action: "rescheduled", kind: t.kind, title: t.title, dueAt: new Date(due).toISOString() });
  });
  return { ok: true };
}

/** Nota en el historial de la oportunidad. */
export async function addOpportunityNote(tenantId: string, id: string, text: string, userId: string | null): Promise<Result> {
  if (text.trim().length < 2) return { ok: false, message: "Escribe la nota." };
  if (!(await db.orm.public.Opportunity.where({ tenantId, id }).select("id").first())) return { ok: false, message: "La oportunidad no existe." };
  await db.transaction((tx) => logEvent(tx, tenantId, id, "NOTE", userId, { text: text.trim().slice(0, 2000) }));
  return { ok: true };
}

/** Duplica una oportunidad abierta (sin actividades ni historial). */
export async function duplicateOpportunity(tenantId: string, id: string, userId: string | null): Promise<Result<{ id: string }>> {
  const o = await db.orm.public.Opportunity.where({ tenantId, id }).first();
  if (!o) return { ok: false, message: "La oportunidad no existe." };
  const stages = await ensureStages(tenantId);
  const stage = stageOf({ ...o, status: "OPEN" }, stages);
  const target = stage.isWon ? stages.find((s) => !s.isWon)! : stage;
  return db.transaction(async (tx) => {
    const created = await createOpportunity(tx, tenantId, { customerId: o.customerId, interest: `${o.interest} (copia)`.slice(0, 200), estimatedValue: o.estimatedValue == null ? null : toNumber(o.estimatedValue), ownerId: o.ownerId ?? userId, source: o.source });
    if (!created.ok) return created;
    await tx.orm.public.Opportunity.where({ tenantId, id: created.id }).update({ stageId: target.id, probability: target.probability, priority: o.priority, tags: [...(o.tags ?? [])], description: o.description, expectedClose: o.expectedClose, stageSince: now() });
    await logEvent(tx, tenantId, created.id, "CREATED", userId, { stage: target.name, copyOf: o.interest });
    return { ok: true as const, id: created.id };
  });
}

/** Elimina una oportunidad sin pedido (con sus actividades pendientes e historial). Con pedido, se pide archivarla (perderla). */
export async function deleteOpportunity(tenantId: string, id: string): Promise<Result> {
  const o = await db.orm.public.Opportunity.where({ tenantId, id }).select("id", "orderId").first();
  if (!o) return { ok: false, message: "La oportunidad no existe." };
  if (o.orderId) return { ok: false, message: "Tiene un pedido: no se puede eliminar." };
  await db.transaction(async (tx) => {
    await tx.orm.public.Task.where({ tenantId, opportunityId: id, status: "OPEN" }).deleteAll();
    await tx.orm.public.OpportunityEvent.where({ tenantId, opportunityId: id }).deleteAll();
    await tx.orm.public.Opportunity.where({ tenantId, id }).deleteAll();
  });
  return { ok: true };
}

/** Registra en el historial que se adjuntó un archivo (comprueba que la oportunidad sea del negocio). */
export async function addOpportunityFileEvent(tenantId: string, id: string, fileName: string, userId: string | null): Promise<Result> {
  if (!(await db.orm.public.Opportunity.where({ tenantId, id }).select("id").first())) return { ok: false, message: "La oportunidad no existe." };
  await db.transaction((tx) => logEvent(tx, tenantId, id, "FILE", userId, { name: fileName.slice(0, 120) }));
  return { ok: true };
}
