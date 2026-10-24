import type { PresenceResult } from "./presence";

/**
 * Presencia v2 — fase A: visibilidad VERIFICADA por pilares, con su tendencia. Reglas puras.
 * Un pilar solo cuenta cuando se puede medir con datos reales; los que aún no se miden (reputación y
 * atribución llegan con PR-28) se muestran «sin medir» y NO se rellenan con un valor inventado: el puntaje
 * se promedia solo sobre lo medido y la cobertura dice cuánto falta por medir.
 */
export type PillarKey = "site" | "onlineSales" | "google" | "reputation" | "attribution" | "basics";
export type Pillar = { key: PillarKey; label: string; hint: string; weight: number; score: number | null; verified: boolean };

export const PILLAR_WEIGHTS: Record<PillarKey, number> = { site: 25, onlineSales: 25, google: 15, reputation: 10, attribution: 15, basics: 10 };
const LABELS: Record<PillarKey, string> = { site: "Sitio", onlineSales: "Venta en línea", google: "Google", reputation: "Reputación", attribution: "Atribución", basics: "Datos básicos" };

export type PillarInput = {
  /** Resultado del puntaje de presencia ya existente (sitio verificado y datos declarados). */
  presence: PresenceResult;
  onlineProducts: number;
  gatewayConnected: boolean;
  paidOnlineLast90d: number;
  /** Ficha de Google: `null` = no conectada (sin medir). `napMatches`: de 4 datos, cuántos coinciden con NEXUS. */
  google?: { status: "OK" | "ERROR" | "PENDING"; napMatches: number } | null;
  /** Reseñas y atribución: `null` = aún no se miden. */
  reputation?: { reviews: number; average: number } | null;
  attribution?: { withOrigin: number; total: number } | null;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computePillars(i: PillarInput): Pillar[] {
  const web = i.presence.checks.filter((c) => c.key === "webActive" || c.key === "webOptimized");
  const webMax = web.reduce((s, c) => s + c.weight, 0);
  const site = clamp((web.reduce((s, c) => s + c.earned, 0) / webMax) * 100);
  const basicChecks = i.presence.checks.filter((c) => !["webActive", "webOptimized"].includes(c.key));
  const basics = clamp((basicChecks.reduce((s, c) => s + c.earned, 0) / basicChecks.reduce((s, c) => s + c.weight, 0)) * 100);
  const onlineSales = clamp((i.onlineProducts > 0 ? 40 : 0) + (i.gatewayConnected ? 30 : 0) + (i.paidOnlineLast90d > 0 ? 30 : 0));
  const g = i.google ?? null;
  const googleScore = g ? (g.status === "OK" ? clamp(60 + (g.napMatches / 4) * 40) : 0) : null;
  const rep = i.reputation;
  const att = i.attribution;
  return [
    { key: "site", label: LABELS.site, weight: PILLAR_WEIGHTS.site, score: site, verified: true, hint: site >= 70 ? "Tu sitio responde y está optimizado." : "Verifica y mejora tu sitio (HTTPS, título, descripción y móvil)." },
    { key: "onlineSales", label: LABELS.onlineSales, weight: PILLAR_WEIGHTS.onlineSales, score: onlineSales, verified: true, hint: onlineSales >= 70 ? "Vendes y cobras en línea." : "Publica productos, conecta una pasarela y recibe tu primer cobro en línea." },
    { key: "google", label: LABELS.google, weight: PILLAR_WEIGHTS.google, score: googleScore, verified: true, hint: !g ? "Sin medir: conecta tu ficha de Google Business para verificarla." : g.status === "OK" ? (g.napMatches === 4 ? "Tu ficha de Google está sincronizada y coincide con tus datos." : `Tu ficha coincide en ${g.napMatches} de 4 datos: corrige el resto.`) : "No se pudo leer tu ficha: revisa la conexión." },
    { key: "reputation", label: LABELS.reputation, weight: PILLAR_WEIGHTS.reputation, score: rep ? clamp((rep.average / 5) * 100 * Math.min(1, rep.reviews / 10)) : null, verified: true, hint: rep ? `${rep.reviews} reseñas, promedio ${rep.average.toFixed(1)}.` : "Sin medir: se mide cuando conectes tus reseñas." },
    { key: "attribution", label: LABELS.attribution, weight: PILLAR_WEIGHTS.attribution, score: att && att.total > 0 ? clamp((att.withOrigin / att.total) * 100) : null, verified: true, hint: att && att.total > 0 ? `${att.withOrigin} de ${att.total} ventas con origen conocido.` : "Sin medir: se mide cuando registres de dónde llegan tus ventas." },
    { key: "basics", label: LABELS.basics, weight: PILLAR_WEIGHTS.basics, score: basics, verified: false, hint: basics >= 90 ? "Identidad, WhatsApp, ubicación y catálogo completos." : "Completa identidad, WhatsApp, ubicación, Google, Instagram y catálogo." },
  ];
}

export type PhaseA = { score: number; coverage: number; phase: "A" | "B_READY"; measured: number };

/** Puntaje de la fase A: promedio ponderado SOLO de los pilares medidos; la cobertura dice cuánto se mide. */
export function phaseA(pillars: readonly Pillar[]): PhaseA {
  const measured = pillars.filter((p) => p.score !== null);
  const weight = measured.reduce((s, p) => s + p.weight, 0);
  const score = weight ? clamp(measured.reduce((s, p) => s + (p.score as number) * p.weight, 0) / weight) : 0;
  const coverage = clamp((weight / pillars.reduce((s, p) => s + p.weight, 0)) * 100);
  // La fase B (madurez NEXUS) se abre cuando la barra está llena: todo medido y alto.
  const full = coverage === 100 && measured.every((p) => (p.score as number) >= 80);
  return { score, coverage, phase: full ? "B_READY" : "A", measured: measured.length };
}

export type Trend = { direction: "up" | "flat" | "down"; delta: number; days: number; series: { day: string; score: number }[] };

/** Tendencia contra la foto más cercana a 30 días atrás (o la más antigua que haya). */
export function trendOf(snapshots: readonly { day: string; score: number }[], today: string): Trend {
  const sorted = [...snapshots].sort((a, b) => a.day.localeCompare(b.day));
  const series = sorted.slice(-30);
  const last = sorted.at(-1);
  if (!last || sorted.length < 2) return { direction: "flat", delta: 0, days: 0, series };
  const target = Date.parse(`${today}T00:00:00Z`) - 30 * 86_400_000;
  const base = [...sorted].slice(0, -1).reduce((best, s) => (Math.abs(Date.parse(`${s.day}T00:00:00Z`) - target) < Math.abs(Date.parse(`${best.day}T00:00:00Z`) - target) ? s : best));
  const delta = last.score - base.score;
  const days = Math.round((Date.parse(`${last.day}T00:00:00Z`) - Date.parse(`${base.day}T00:00:00Z`)) / 86_400_000);
  return { direction: delta >= 3 ? "up" : delta <= -3 ? "down" : "flat", delta, days, series };
}
