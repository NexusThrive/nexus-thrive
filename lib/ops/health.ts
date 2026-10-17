import { db } from "@/prisma/db";
import { listCharges, listSubscriptions } from "./billing";
import { healthScore, type HealthFacts } from "./health-rules";
import { daysBetween } from "./billing-rules";
import { todayBogota } from "./leads";
import { onboardingBoardFor } from "./onboarding-board";
import { listSurveys } from "./satisfaction";
import { isOpenStatus, slaState } from "./support-rules";
import { listTickets } from "./tickets";

/** Salud de cada cuenta viva con su explicación (servidor). */
export async function accountHealth(filter: { tenantId?: string } = {}) {
  const tenants = (await db.orm.public.Tenant.select("id", "name", "vertical", "active", "accountStage", "accountManagerId").all()).filter(
    (t) => t.accountStage !== "ARCHIVED" && t.accountStage !== "CANCELLED" && (!filter.tenantId || t.id === filter.tenantId),
  );
  if (!tenants.length) return [];
  const ids = tenants.map((t) => t.id);
  const lastOf = async (q: PromiseLike<{ tenantId: string; last: unknown }[]>) => new Map((await q).map((r) => [r.tenantId, r.last ? String(r.last).slice(0, 10) : null]));
  const [cust, pay, exp, book, onboarding, subs, charges, tickets, surveys, staff] = await Promise.all([
    lastOf(db.orm.public.Customer.where((x) => x.tenantId.in(ids)).groupBy("tenantId").aggregate((a) => ({ last: a.max("createdAt") }))),
    lastOf(db.orm.public.Payment.where((x) => x.tenantId.in(ids)).groupBy("tenantId").aggregate((a) => ({ last: a.max("createdAt") }))),
    lastOf(db.orm.public.Expense.where((x) => x.tenantId.in(ids)).groupBy("tenantId").aggregate((a) => ({ last: a.max("createdAt") }))),
    lastOf(db.orm.public.Booking.where((x) => x.tenantId.in(ids)).groupBy("tenantId").aggregate((a) => ({ last: a.max("createdAt") }))),
    onboardingBoardFor(ids),
    listSubscriptions(),
    listCharges(filter.tenantId ? { tenantId: filter.tenantId } : {}),
    listTickets(filter.tenantId ? { tenantId: filter.tenantId } : {}),
    listSurveys(filter.tenantId ? { tenantId: filter.tenantId } : {}),
    db.orm.public.StaffMember.select("id", "name", "email").all(),
  ]);
  const today = todayBogota();
  const now = Date.now();
  const sn = new Map(staff.map((s) => [s.id, s.name ?? s.email]));
  const worst = { suspend_eligible: "suspendable", notice_running: "notice", notice_needed: "notice", grace: "grace" } as Record<string, HealthFacts["billing"]>;
  const order: HealthFacts["billing"][] = ["ok", "grace", "notice", "suspendable"];
  return tenants
    .map((t) => {
      const dates = [cust.get(t.id), pay.get(t.id), exp.get(t.id), book.get(t.id)].filter((d): d is string => !!d).sort();
      const last = dates.at(-1) ?? null;
      const mine = charges.filter((c) => c.tenantId === t.id && c.status === "PENDING");
      const billing = mine.map((c) => worst[c.dunning.stage] ?? "ok").reduce<HealthFacts["billing"]>((w, x) => (order.indexOf(x) > order.indexOf(w) ? x : w), "ok");
      const open = tickets.filter((k) => k.tenantId === t.id && isOpenStatus(k.status));
      const facts: HealthFacts = {
        daysSinceActivity: last ? Math.max(0, daysBetween(last, today)) : null,
        onboardingPct: onboarding.get(t.id) ?? 0,
        hasSubscription: subs.some((s) => s.tenantId === t.id),
        billing,
        serviceSuspended: !t.active,
        openTickets: open.length,
        breachedTickets: open.filter((k) => slaState(k, now).state === "breached").length,
        scores: surveys.filter((s) => s.tenantId === t.id && s.score != null).map((s) => s.score!),
      };
      return { id: t.id, name: t.name, vertical: t.vertical, managerName: t.accountManagerId ? (sn.get(t.accountManagerId) ?? null) : null, lastActivity: last, ...healthScore(facts) };
    })
    .sort((a, b) => a.score - b.score);
}

export type HealthRow = Awaited<ReturnType<typeof accountHealth>>[number];
