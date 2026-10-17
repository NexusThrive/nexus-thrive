import { db } from "@/prisma/db";
import { checklist, type ChecklistFacts } from "./onboarding-checklist";

/** Datos reales con los que se marca el checklist de cada negocio. */
async function checklistFacts(ids: string[]): Promise<Map<string, ChecklistFacts>> {
  if (!ids.length) return new Map();
  const tenants = await db.orm.public.Tenant.where((t) => t.id.in(ids)).select("id", "onboardingCompleted", "planSelectedAt", "accountManagerId").all();
  const count = async (q: PromiseLike<{ tenantId: string; n: number }[]>) => new Map((await q).map((r) => [r.tenantId, r.n]));
  const [contacts, users, customers, payments, expenses, modules] = await Promise.all([
    count(db.orm.public.TenantContact.where((c) => c.tenantId.in(ids)).groupBy("tenantId").aggregate((a) => ({ n: a.count() }))),
    count(db.orm.public.User.where((u) => u.tenantId.in(ids)).groupBy("tenantId").aggregate((a) => ({ n: a.count() }))),
    count(db.orm.public.Customer.where((c) => c.tenantId.in(ids)).groupBy("tenantId").aggregate((a) => ({ n: a.count() }))),
    count(db.orm.public.Payment.where((p) => p.tenantId.in(ids)).groupBy("tenantId").aggregate((a) => ({ n: a.count() }))),
    count(db.orm.public.Expense.where((e) => e.tenantId.in(ids)).groupBy("tenantId").aggregate((a) => ({ n: a.count() }))),
    count(
      db.orm.public.TenantModule.where((m) => m.tenantId.in(ids))
        .where({ active: true })
        .where((m) => m.moduleName.neq("dashboard"))
        .groupBy("tenantId")
        .aggregate((a) => ({ n: a.count() })),
    ),
  ]);
  return new Map(
    tenants.map((t) => [
      t.id,
      {
        onboardingCompleted: t.onboardingCompleted,
        planSelected: !!t.planSelectedAt,
        hasManager: !!t.accountManagerId,
        contacts: contacts.get(t.id) ?? 0,
        users: users.get(t.id) ?? 0,
        customers: customers.get(t.id) ?? 0,
        movements: (payments.get(t.id) ?? 0) + (expenses.get(t.id) ?? 0),
        extraModules: modules.get(t.id) ?? 0,
      },
    ]),
  );
}

/**
 * Cuentas en puesta en marcha: etapa ONBOARDING, registro sin terminar o
 * creadas en los últimos 30 días. Cada una con su checklist calculado.
 */
export async function onboardingBoard() {
  const since = Date.now() - 30 * 86_400_000;
  const tenants = await db.orm.public.Tenant.select("id", "name", "slug", "vertical", "createdAt", "onboardingCompleted", "accountManagerId", "accountStage", "active").all();
  const scope = tenants.filter((t) => t.accountStage === "ONBOARDING" || !t.onboardingCompleted || Date.parse(String(t.createdAt)) >= since);
  const [facts, staff] = await Promise.all([checklistFacts(scope.map((t) => t.id)), db.orm.public.StaffMember.select("id", "name", "email").all()]);
  const names = new Map(staff.map((s) => [s.id, s.name ?? s.email]));
  return scope
    .filter((t) => facts.has(t.id))
    .map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      vertical: t.vertical,
      active: t.active,
      createdAt: String(t.createdAt),
      managerName: t.accountManagerId ? (names.get(t.accountManagerId) ?? null) : null,
      ...checklist(facts.get(t.id)!),
    }))
    .sort((a, b) => a.pct - b.pct || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export type OnboardingRow = Awaited<ReturnType<typeof onboardingBoard>>[number];

/** Avance del checklist (0–100) por negocio (salud de cuenta). */
export async function onboardingBoardFor(ids: string[]): Promise<Map<string, number>> {
  const facts = await checklistFacts(ids);
  return new Map([...facts].map(([id, f]) => [id, checklist(f).pct]));
}
