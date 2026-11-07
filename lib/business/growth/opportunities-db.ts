import { toNumber } from "@/lib/foundation/format";
import type { DbWriter } from "@/lib/foundation/db/db-transaction";
import { findOrCreateContact } from "@/lib/business/customers/contacts-db";
import { db } from "@/prisma/db";
import { OPEN_STAGES, byUrgency, validateLoss, validateOpportunity, type OpportunityStage, type OpportunityStatus } from "./opportunities";

/** Oportunidades del negocio (HU-leads-01). Todo por `tenantId`; siempre ligadas a un contacto. */
export type OpportunityRow = { id: string; customerId: string; customerName: string; interest: string; estimatedValue: number | null; stage: OpportunityStage; status: OpportunityStatus; nextAction: string | null; nextActionAt: string | null; lostReason: string | null; source: string | null; createdAt: string };

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

/** Crea una oportunidad para un contacto del negocio. */
export async function createOpportunity(tx: DbWriter, tenantId: string, input: { customerId: string; interest: string; estimatedValue?: number | null; nextAction?: string | null; nextActionAt?: Temporal.Instant | null; ownerId?: string | null; source?: string | null; leadId?: string | null }): Promise<Result<{ id: string }>> {
  const problem = validateOpportunity(input);
  if (problem) return { ok: false, message: problem };
  if (!(await tx.orm.public.Customer.where({ tenantId, id: input.customerId }).select("id").first())) return { ok: false, message: "El contacto no existe en este negocio." };
  const created = await tx.orm.public.Opportunity.create({
    tenantId,
    customerId: input.customerId,
    interest: input.interest.trim().slice(0, 200),
    estimatedValue: input.estimatedValue == null ? null : input.estimatedValue.toFixed(2),
    nextAction: input.nextAction?.trim().slice(0, 200) || null,
    nextActionAt: input.nextActionAt ?? null,
    ownerId: input.ownerId ?? null,
    source: input.source ?? null,
    leadId: input.leadId ?? null,
  });
  return { ok: true, id: created.id };
}

/** Mueve una oportunidad abierta a otra etapa. */
export async function moveStage(tenantId: string, id: string, stage: OpportunityStage): Promise<Result> {
  if (!OPEN_STAGES.includes(stage)) return { ok: false, message: "Esa etapa no existe." };
  const plan = db.sql.public.Opportunity.update({ stage })
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "OPEN")))
    .returning("id")
    .build();
  return (await db.transaction((tx) => tx.query(plan))).length ? { ok: true } : { ok: false, message: "La oportunidad ya está cerrada o no existe." };
}

/** Fija el siguiente paso y cuándo. */
export async function setNextAction(tenantId: string, id: string, action: string, at: Temporal.Instant | null): Promise<Result> {
  if (action.trim().length < 3) return { ok: false, message: "Escribe cuál es el siguiente paso." };
  const plan = db.sql.public.Opportunity.update({ nextAction: action.trim().slice(0, 200), nextActionAt: at })
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "OPEN")))
    .returning("id")
    .build();
  return (await db.transaction((tx) => tx.query(plan))).length ? { ok: true } : { ok: false, message: "La oportunidad ya está cerrada o no existe." };
}

const closedAt = () => Temporal.Instant.fromEpochMilliseconds(Date.now());

/** Gana la oportunidad: el contacto pasa a cliente (nunca baja de etapa) y NO se duplica la persona. */
export async function winOpportunity(tx: DbWriter, tenantId: string, id: string, orderId?: string | null): Promise<Result> {
  const o = await tx.orm.public.Opportunity.where({ tenantId, id }).first();
  if (!o || o.status !== "OPEN") return { ok: false, message: "La oportunidad ya está cerrada o no existe." };
  await tx.orm.public.Opportunity.where({ tenantId, id }).update({ status: "WON", closedAt: closedAt(), orderId: orderId ?? null, nextAction: null, nextActionAt: null });
  const customer = await tx.orm.public.Customer.where({ tenantId, id: o.customerId }).select("stage").first();
  if (customer?.stage === "PROSPECT") await tx.orm.public.Customer.where({ tenantId, id: o.customerId }).update({ stage: "CUSTOMER" });
  return { ok: true };
}

/** Pierde la oportunidad con su motivo. */
export async function loseOpportunity(tenantId: string, id: string, reason: string): Promise<Result> {
  const problem = validateLoss(reason);
  if (problem) return { ok: false, message: problem };
  const plan = db.sql.public.Opportunity.update({ status: "LOST", lostReason: reason.trim().slice(0, 200), closedAt: closedAt(), nextAction: null, nextActionAt: null })
    .where((f, fns) => fns.and(fns.eq(f.id, id), fns.eq(f.tenantId, tenantId), fns.eq(f.status, "OPEN")))
    .returning("id")
    .build();
  return (await db.transaction((tx) => tx.query(plan))).length ? { ok: true } : { ok: false, message: "La oportunidad ya está cerrada o no existe." };
}

/** Cuando un pedido del contacto se paga, sus oportunidades abiertas se ganan con ese pedido. */
export async function winOpenOpportunitiesOf(tx: DbWriter, tenantId: string, customerId: string, orderId: string): Promise<number> {
  const open = await tx.orm.public.Opportunity.where({ tenantId, customerId, status: "OPEN" }).select("id").limit(20).all();
  for (const o of open) await winOpportunity(tx, tenantId, o.id, orderId);
  return open.length;
}

/** Oportunidades del negocio, las de acción vencida o más cercana primero. */
export async function listOpportunities(tenantId: string, status: OpportunityStatus = "OPEN", limit = 300): Promise<OpportunityRow[]> {
  const rows = await db.orm.public.Opportunity.where({ tenantId, status }).orderBy((o) => o.createdAt.desc()).limit(limit).all();
  const ids = [...new Set(rows.map((r) => r.customerId))];
  const customers = ids.length ? await db.orm.public.Customer.where({ tenantId }).where((c) => c.id.in(ids)).select("id", "name").all() : [];
  const names = new Map(customers.map((c) => [c.id, c.name]));
  return byUrgency(rows.map((o) => ({ id: o.id, customerId: o.customerId, customerName: names.get(o.customerId) ?? "Contacto", interest: o.interest, estimatedValue: o.estimatedValue == null ? null : toNumber(o.estimatedValue), stage: o.stage as OpportunityStage, status: o.status as OpportunityStatus, nextAction: o.nextAction, nextActionAt: o.nextActionAt ? String(o.nextActionAt) : null, lostReason: o.lostReason, source: o.source, createdAt: String(o.createdAt) })));
}

/**
 * Migra los contactos del formulario que ya existían (`ContactLead`) a oportunidades: cada uno encuentra o crea su contacto por
 * teléfono canónico y abre una oportunidad nueva. Idempotente (una oportunidad por contacto del formulario).
 */
export async function migrateContactLeads(tenantId: string): Promise<{ migrated: number; skipped: number }> {
  const leads = await db.orm.public.ContactLead.where({ tenantId }).orderBy((l) => l.createdAt.asc()).limit(2000).all();
  const have = new Set((await db.orm.public.Opportunity.where({ tenantId }).select("leadId").limit(5000).all()).map((o) => o.leadId).filter(Boolean));
  let migrated = 0;
  let skipped = 0;
  for (const l of leads) {
    if (have.has(l.id)) {
      skipped++;
      continue;
    }
    const done = await db.transaction(async (tx) => {
      const contact = await findOrCreateContact(tx, tenantId, { name: l.name, phone: l.phone, email: l.email, source: "WEB", stage: "PROSPECT" });
      if (!contact) return false;
      const r = await createOpportunity(tx, tenantId, { customerId: contact.id, interest: l.message?.trim() || "Escribió desde el sitio", source: "WEB", leadId: l.id });
      return r.ok;
    });
    if (done) migrated++;
    else skipped++;
  }
  return { migrated, skipped };
}

/** Crea una oportunidad en su propia transacción (para las pantallas). */
export const createOpportunityNow = (tenantId: string, input: Parameters<typeof createOpportunity>[2]) => db.transaction((tx) => createOpportunity(tx, tenantId, input));

/** Gana una oportunidad en su propia transacción (para las pantallas). */
export const winOpportunityNow = (tenantId: string, id: string, orderId?: string | null) => db.transaction((tx) => winOpportunity(tx, tenantId, id, orderId));
