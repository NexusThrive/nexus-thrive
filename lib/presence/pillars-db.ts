import { todayCO } from "@/lib/tax/tax";
import { db } from "@/prisma/db";
import { listingView } from "@/lib/google/google-db";
import { attributionStats, reputationOf } from "@/lib/growth/growth-db";
import { loadPresence } from "./load";
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
