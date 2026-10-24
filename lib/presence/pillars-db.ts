import { todayCO } from "@/lib/tax/tax";
import { db } from "@/prisma/db";
import { listingView } from "@/lib/google/google-db";
import { attributionStats, reputationOf } from "@/lib/growth/growth-db";
import { loadPresence } from "./load";
import { emitEvent } from "@/lib/events/outbox";
import { isoWeek, phaseChangeNotice, weeklyReport, type Phase } from "./notices";
import { computeMaturity, type Maturity, type MaturityInput } from "./maturity";
import { computePillars, phaseA, trendOf, type Pillar, type PhaseA, type Trend } from "./pillars";

/** Presencia v2 (servidor): pilares con datos reales del negocio, foto diaria y tendencia. Todo por `tenantId`. */
export type PresenceV2 = { pillars: Pillar[]; phase: PhaseA; trend: Trend; checkedAt: string; maturity: Maturity | null };

/** Conteos reales de los últimos 30 días para la madurez NEXUS (fase B). */
export async function maturityInput(tenantId: string): Promise<MaturityInput> {
  const since = Temporal.Instant.fromEpochMilliseconds(Date.now() - 30 * 86_400_000);
  const [invoices, products, moves, sessions, customers, payments, expenses] = await Promise.all([
    db.orm.public.Invoice.where({ tenantId }).where((i) => i.issueDate.gte(since)).aggregate((a) => ({ n: a.count() })),
    db.orm.public.Product.where({ tenantId, active: true }).aggregate((a) => ({ n: a.count() })),
    db.orm.public.StockMovement.where({ tenantId }).where((m) => m.createdAt.gte(since)).aggregate((a) => ({ n: a.count() })),
    db.orm.public.CashSession.where({ tenantId }).where((s) => s.openedAt.gte(since)).aggregate((a) => ({ n: a.count() })),
    db.orm.public.Customer.where({ tenantId, active: true }).aggregate((a) => ({ n: a.count() })),
    db.orm.public.Payment.where({ tenantId }).where((p) => p.createdAt.gte(since)).select("customerId").limit(5000).all(),
    db.orm.public.Expense.where({ tenantId }).where((e) => e.date.gte(since)).aggregate((a) => ({ n: a.count() })),
  ]);
  return { invoices30d: Number(invoices.n), productsActive: Number(products.n), stockMovements30d: Number(moves.n), cashSessions30d: Number(sessions.n), customers: Number(customers.n), customersWithPurchase30d: new Set(payments.map((p) => p.customerId).filter(Boolean)).size, expenses30d: Number(expenses.n) };
}

async function pillarsFor(tenantId: string): Promise<{ pillars: Pillar[]; phase: PhaseA }> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) throw new Error("Negocio no encontrado");
  const since = Temporal.Instant.fromEpochMilliseconds(Date.now() - 90 * 86_400_000);
  const [presence, online, gateway, paid, listing, rep, attribution] = await Promise.all([
    loadPresence({ id: tenant.id, name: tenant.name, address: tenant.address, whatsappNumber: tenant.whatsappNumber, latitude: tenant.latitude, longitude: tenant.longitude, googleBusinessUrl: tenant.googleBusinessUrl, instagramHandle: tenant.instagramHandle, websiteUrl: tenant.websiteUrl }),
    db.orm.public.Product.where({ tenantId, active: true, publishedOnline: true }).aggregate((a) => ({ n: a.count() })),
    db.orm.public.ExternalConnection.where({ tenantId, kind: "PAYMENT", status: "CONNECTED" }).select("id").first(),
    db.orm.public.PaymentIntent.where({ tenantId, status: "PAID" }).where((i) => i.paidAt.gte(since)).aggregate((a) => ({ n: a.count() })),
    listingView(tenantId),
    reputationOf(tenantId),
    attributionStats(tenantId),
  ]);
  const pillars = computePillars({ presence, onlineProducts: Number(online.n), gatewayConnected: gateway !== null, paidOnlineLast90d: Number(paid.n), google: listing.connected && listing.status ? { status: listing.status, napMatches: listing.napMatches } : null, reputation: rep ? { reviews: rep.count, average: rep.average } : null, attribution });
  return { pillars, phase: phaseA(pillars) };
}

/** Guarda (o actualiza) la foto de hoy. Se llama cuando pasa algo que mueve la presencia: es barata e idempotente por día. */
export async function refreshPresence(tenantId: string): Promise<PhaseA> {
  const { pillars, phase } = await pillarsFor(tenantId);
  const day = todayCO();
  // Aviso de cambio de fase: se compara con la foto de hoy (si ya existe) o con la última anterior, y solo avisa una vez.
  const baseline = (await db.orm.public.PresenceSnapshot.where({ tenantId, day }).first()) ?? (await db.orm.public.PresenceSnapshot.where({ tenantId }).where((s) => s.day.lt(day)).orderBy((s) => s.day.desc()).first());
  const notice = phaseChangeNotice((baseline?.phase as Phase | undefined) ?? null, phase.phase);
  if (notice) await db.transaction((tx) => emitEvent(tx, tenantId, { type: "presence.phase_changed", resourceType: "presence", resourceId: day, payload: { from: baseline!.phase, to: phase.phase, score: phase.score, ...notice } }));
  await db.orm.public.PresenceSnapshot.upsert({
    create: { tenantId, day, score: phase.score, coverage: phase.coverage, phase: phase.phase, pillars: pillars.map((p) => ({ key: p.key, score: p.score, verified: p.verified })) as never },
    update: { score: phase.score, coverage: phase.coverage, phase: phase.phase, pillars: pillars.map((p) => ({ key: p.key, score: p.score, verified: p.verified })) as never },
    conflictOn: { tenantId, day },
  });
  return phase;
}

/** Lo que muestra la barra de presencia v2: pilares, fase A y tendencia (refresca la foto de hoy). */
export async function presenceV2(tenantId: string): Promise<PresenceV2> {
  const { pillars, phase } = await pillarsFor(tenantId);
  await refreshPresence(tenantId);
  const snaps = await db.orm.public.PresenceSnapshot.where({ tenantId }).orderBy((s) => s.day.desc()).limit(60).all();
  const day = todayCO();
  return { pillars, phase, trend: trendOf(snaps.map((s) => ({ day: s.day, score: s.score })), day), checkedAt: day, maturity: phase.phase === "B_READY" ? computeMaturity(await maturityInput(tenantId)) : null };
}

/** Reporte semanal de un negocio: una sola vez por semana ISO (la llave va en el evento). Devuelve `true` si lo emitió. */
export async function sendWeeklyReport(tenantId: string): Promise<boolean> {
  const week = isoWeek(todayCO());
  if (await db.orm.public.OutboxEvent.where({ tenantId, type: "presence.weekly_report", resourceId: week }).select("id").first()) return false;
  const v2 = await presenceV2(tenantId);
  const report = weeklyReport({ day: v2.checkedAt, score: v2.phase.score, coverage: v2.phase.coverage, pillars: v2.pillars, trend: v2.trend, maturity: v2.maturity });
  await db.transaction((tx) => emitEvent(tx, tenantId, { type: "presence.weekly_report", resourceType: "presence", resourceId: week, payload: report }));
  return true;
}

/** Reportes de todos los negocios activos (lo llama el cron); un negocio con error no frena a los demás. */
export async function sendWeeklyReports(): Promise<{ sent: number; failed: number }> {
  const tenants = await db.orm.public.Tenant.where({ active: true }).select("id").limit(1000).all();
  let sent = 0;
  let failed = 0;
  for (const t of tenants) {
    try {
      if (await sendWeeklyReport(t.id)) sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
