import { db } from "@/prisma/db";
import type { LeadActivityKind, LeadStageValue, LeadValues } from "./crm-rules";

/** CRM comercial de NEXUS: acceso a datos (servidor). */

const instant = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms);
const now = () => instant(Date.now());
/** Fecha del próximo paso (YYYY-MM-DD) guardada al mediodía UTC. */
const dateToInstant = (d: string | null) => (d ? Temporal.Instant.from(`${d}T12:00:00Z`) : null);
const iso = (v: unknown) => (v ? String(v) : null);

/** Hoy en Colombia (YYYY-MM-DD). */
export function todayBogota(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

export type LeadRow = {
  id: string;
  company: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  vertical: string | null;
  city: string | null;
  source: string;
  stage: LeadStageValue;
  ownerId: string | null;
  ownerName: string | null;
  nextStep: string | null;
  nextStepDate: string | null;
  valueUsdCents: number;
  plan: string | null;
  notes: string | null;
  lostReason: string | null;
  tenantId: string | null;
  stageChangedAt: string;
  createdAt: string;
};

async function staffNames() {
  const rows = await db.orm.public.StaffMember.select("id", "name", "email").all();
  return new Map(rows.map((r) => [r.id, r.name ?? r.email]));
}

function toRow(l: Record<string, unknown>, names: Map<string, string>): LeadRow {
  return {
    id: l.id as string,
    company: l.company as string,
    contactName: (l.contactName as string | null) ?? null,
    phone: (l.phone as string | null) ?? null,
    email: (l.email as string | null) ?? null,
    vertical: (l.vertical as string | null) ?? null,
    city: (l.city as string | null) ?? null,
    source: l.source as string,
    stage: l.stage as LeadStageValue,
    ownerId: (l.ownerId as string | null) ?? null,
    ownerName: l.ownerId ? (names.get(l.ownerId as string) ?? null) : null,
    nextStep: (l.nextStep as string | null) ?? null,
    nextStepDate: iso(l.nextStepAt)?.slice(0, 10) ?? null,
    valueUsdCents: l.valueUsdCents as number,
    plan: (l.plan as string | null) ?? null,
    notes: (l.notes as string | null) ?? null,
    lostReason: (l.lostReason as string | null) ?? null,
    tenantId: (l.tenantId as string | null) ?? null,
    stageChangedAt: String(l.stageChangedAt),
    createdAt: String(l.createdAt),
  };
}

export async function listLeads(): Promise<LeadRow[]> {
  const [rows, names] = await Promise.all([db.orm.public.Lead.orderBy((l) => l.updatedAt.desc()).all(), staffNames()]);
  return rows.map((r) => toRow(r as unknown as Record<string, unknown>, names));
}

export async function getLead(id: string): Promise<LeadRow | null> {
  const [row, names] = await Promise.all([db.orm.public.Lead.where({ id }).first(), staffNames()]);
  return row ? toRow(row as unknown as Record<string, unknown>, names) : null;
}

export type LeadActivityRow = { id: string; kind: LeadActivityKind; body: string; staffName: string | null; createdAt: string };

export async function listLeadActivity(leadId: string): Promise<LeadActivityRow[]> {
  const rows = await db.orm.public.LeadActivity.where({ leadId }).orderBy((a) => a.createdAt.desc()).all();
  return rows.map((a) => ({ id: a.id, kind: a.kind as LeadActivityKind, body: a.body, staffName: a.staffName, createdAt: String(a.createdAt) }));
}

function data(v: LeadValues) {
  const { nextStepDate, ...rest } = v;
  return { ...rest, nextStepAt: dateToInstant(nextStepDate) };
}

export async function createLead(v: LeadValues): Promise<string> {
  const row = await db.orm.public.Lead.create({ ...data(v), stageChangedAt: now() });
  return row.id;
}

/** Actualiza el lead; si cambia de etapa, sella la fecha del cambio. */
export async function updateLead(id: string, v: LeadValues, stageChanged: boolean) {
  await db.orm.public.Lead.where({ id }).update({ ...data(v), ...(stageChanged ? { stageChangedAt: now() } : {}) });
}

export async function addLeadActivity(leadId: string, kind: LeadActivityKind, body: string, staff: { staffId: string; name: string | null; email: string }) {
  await db.orm.public.LeadActivity.create({ leadId, kind, body, staffId: staff.staffId, staffName: staff.name ?? staff.email });
}

/** Marca el lead como tocado (sube en la lista tras una actividad). */
export async function touchLead(id: string) {
  await db.orm.public.Lead.where({ id }).update({ updatedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) });
}

export async function deleteLead(id: string) {
  await db.orm.public.Lead.where({ id }).delete();
}

/** Negocios para vincular un lead ganado. */
export async function tenantOptions() {
  const rows = await db.orm.public.Tenant.select("id", "name", "slug").orderBy((t) => t.name.asc()).all();
  return rows.map((t) => ({ id: t.id, name: t.name, slug: t.slug }));
}
