import { db } from "@/prisma/db";
import { checklist } from "./onboarding-checklist";

/**
 * Cuentas en puesta en marcha: etapa ONBOARDING, registro sin terminar o
 * creadas en los últimos 30 días. Cada una con su checklist calculado.
 */
export async function onboardingBoard() {
  const since = Date.now() - 30 * 86_400_000;
  const tenants = await db.orm.public.Tenant.select("id", "name", "slug", "vertical", "createdAt", "onboardingCompleted", "planSelectedAt", "accountManagerId", "accountStage", "active").all();
  const scope = tenants.filter((t) => t.accountStage === "ONBOARDING" || !t.onboardingCompleted || Date.parse(String(t.createdAt)) >= since);
  if (scope.length === 0) return [];
  const ids = scope.map((t) => t.id);
  const count = async (q: PromiseLike<{ tenantId: string; n: number }[]>) => new Map((await q).map((r) => [r.tenantId, r.n]));
  const [contacts, users, customers, payments, expenses, modules, staff] = await Promise.all([
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
    db.orm.public.StaffMember.select("id", "name", "email").all(),
  ]);
  const names = new Map(staff.map((s) => [s.id, s.name ?? s.email]));
  return scope
    .map((t) => {
      const c = checklist({
        onboardingCompleted: t.onboardingCompleted,
        planSelected: !!t.planSelectedAt,
        hasManager: !!t.accountManagerId,
        contacts: contacts.get(t.id) ?? 0,
        users: users.get(t.id) ?? 0,
        customers: customers.get(t.id) ?? 0,
        movements: (payments.get(t.id) ?? 0) + (expenses.get(t.id) ?? 0),
        extraModules: modules.get(t.id) ?? 0,
      });
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        vertical: t.vertical,
        active: t.active,
        createdAt: String(t.createdAt),
        managerName: t.accountManagerId ? (names.get(t.accountManagerId) ?? null) : null,
        ...c,
      };
    })
    .sort((a, b) => a.pct - b.pct || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export type OnboardingRow = Awaited<ReturnType<typeof onboardingBoard>>[number];
