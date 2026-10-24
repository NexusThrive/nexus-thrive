import { todayCO } from "@/lib/tax/tax";
import { db } from "@/prisma/db";
import { loadPresence } from "./load";
import { computePillars, phaseA, trendOf, type Pillar, type PhaseA, type Trend } from "./pillars";

/** Presencia v2 (servidor): pilares con datos reales del negocio, foto diaria y tendencia. Todo por `tenantId`. */
export type PresenceV2 = { pillars: Pillar[]; phase: PhaseA; trend: Trend; checkedAt: string };

async function pillarsFor(tenantId: string): Promise<{ pillars: Pillar[]; phase: PhaseA }> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) throw new Error("Negocio no encontrado");
  const since = Temporal.Instant.fromEpochMilliseconds(Date.now() - 90 * 86_400_000);
  const [presence, online, gateway, paid] = await Promise.all([
    loadPresence({ id: tenant.id, name: tenant.name, address: tenant.address, whatsappNumber: tenant.whatsappNumber, latitude: tenant.latitude, longitude: tenant.longitude, googleBusinessUrl: tenant.googleBusinessUrl, instagramHandle: tenant.instagramHandle, websiteUrl: tenant.websiteUrl }),
    db.orm.public.Product.where({ tenantId, active: true, publishedOnline: true }).aggregate((a) => ({ n: a.count() })),
    db.orm.public.ExternalConnection.where({ tenantId, kind: "PAYMENT", status: "CONNECTED" }).select("id").first(),
    db.orm.public.PaymentIntent.where({ tenantId, status: "PAID" }).where((i) => i.paidAt.gte(since)).aggregate((a) => ({ n: a.count() })),
  ]);
  const pillars = computePillars({ presence, onlineProducts: Number(online.n), gatewayConnected: gateway !== null, paidOnlineLast90d: Number(paid.n) });
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
  return { pillars, phase, trend: trendOf(snaps.map((s) => ({ day: s.day, score: s.score })), day), checkedAt: day };
}
