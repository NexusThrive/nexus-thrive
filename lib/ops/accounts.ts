import { db } from "@/prisma/db";
import type { VerticalValue } from "@/lib/admin-catalogs";

/** Cuentas (negocios) vistas desde el Operations Center. */

import type { AccountStageValue } from "./account-stages";
export { ACCOUNT_STAGES, type AccountStageValue } from "./account-stages";

export type PriorityItem = { id: string; name: string; slug: string; vertical: VerticalValue; detail: string; at: string };
export type Priorities = {
  needSetup: PriorityItem[];
  suspended: PriorityItem[];
  unassigned: PriorityItem[];
  recent: PriorityItem[];
};

const DAY = 86_400_000;

/**
 * "Prioridades de hoy" del Inicio: lo que pide acción ahora, con datos
 * reales. Las fases siguientes suman leads, tickets y cobros.
 */
export async function getPriorities(): Promise<Priorities> {
  const tenants = await db.orm.public.Tenant.select(
    "id",
    "name",
    "slug",
    "vertical",
    "active",
    "onboardingCompleted",
    "accountManagerId",
    "accountStage",
    "suspendedReason",
    "suspendedAt",
    "createdAt",
  ).all();
  const item = (t: (typeof tenants)[number], detail: string, at: unknown): PriorityItem => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    vertical: t.vertical as VerticalValue,
    detail,
    at: String(at),
  });
  const live = tenants.filter((t) => t.accountStage !== "ARCHIVED" && t.accountStage !== "CANCELLED");
  const sinceWeek = Date.now() - 7 * DAY;
  return {
    needSetup: live.filter((t) => !t.onboardingCompleted).map((t) => item(t, "Onboarding sin terminar", t.createdAt)),
    suspended: live.filter((t) => !t.active).map((t) => item(t, t.suspendedReason ?? "Suspendido", t.suspendedAt ?? t.createdAt)),
    unassigned: live.filter((t) => t.active && !t.accountManagerId).map((t) => item(t, "Sin responsable de cuenta", t.createdAt)),
    recent: live
      .filter((t) => Date.parse(String(t.createdAt)) >= sinceWeek)
      .map((t) => item(t, "Negocio nuevo", t.createdAt))
      .sort((a, b) => (a.at < b.at ? 1 : -1)),
  };
}

export type ContactRow = {
  id: string;
  name: string;
  purpose: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  preferredChannel: string | null;
  hours: string | null;
  notes: string | null;
};

export type AccountExtras = {
  stage: AccountStageValue;
  managerId: string | null;
  managerName: string | null;
  plan: string;
  billingCycle: string;
  planMonthlyUsdCents: number;
  contacts: ContactRow[];
};

export async function getAccountExtras(tenantId: string): Promise<AccountExtras | null> {
  const t = await db.orm.public.Tenant.where({ id: tenantId })
    .select("accountStage", "accountManagerId", "plan", "billingCycle", "planMonthlyUsdCents")
    .first();
  if (!t) return null;
  const [manager, contacts] = await Promise.all([
    t.accountManagerId ? db.orm.public.StaffMember.where({ id: t.accountManagerId }).select("name", "email").first() : null,
    db.orm.public.TenantContact.where({ tenantId }).orderBy((c) => c.createdAt.asc()).all(),
  ]);
  return {
    stage: t.accountStage as AccountStageValue,
    managerId: t.accountManagerId,
    managerName: manager ? (manager.name ?? manager.email) : null,
    plan: t.plan,
    billingCycle: t.billingCycle,
    planMonthlyUsdCents: t.planMonthlyUsdCents,
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      purpose: c.purpose,
      phone: c.phone,
      whatsapp: c.whatsapp,
      email: c.email,
      preferredChannel: c.preferredChannel,
      hours: c.hours,
      notes: c.notes,
    })),
  };
}

export async function listManagers(): Promise<{ id: string; name: string }[]> {
  const rows = await db.orm.public.StaffMember.where({ active: true }).select("id", "name", "email").all();
  return rows.map((r) => ({ id: r.id, name: r.name ?? r.email }));
}

export async function updateAccount(tenantId: string, data: { accountStage: AccountStageValue; accountManagerId: string | null }) {
  await db.orm.public.Tenant.where({ id: tenantId }).update(data);
}

export async function saveContact(tenantId: string, id: string | undefined, data: Omit<ContactRow, "id">) {
  if (id) {
    await db.orm.public.TenantContact.where({ id, tenantId }).update(data);
    return id;
  }
  const created = await db.orm.public.TenantContact.create({ ...data, tenantId });
  return created.id;
}

export async function deleteContact(tenantId: string, id: string) {
  await db.orm.public.TenantContact.where({ id, tenantId }).delete();
}

export async function tenantName(tenantId: string): Promise<string | null> {
  const t = await db.orm.public.Tenant.where({ id: tenantId }).select("name").first();
  return t?.name ?? null;
}
