/**
 * Salud de cuenta (pura y explicable). Cinco factores suman 100; cada uno
 * dice cuántos puntos aporta, por qué y qué hacer para mejorarlo.
 */

export type HealthFacts = {
  /** Días desde el último movimiento real (cliente, cobro, gasto, reserva); null = nunca. */
  daysSinceActivity: number | null;
  /** Avance del checklist de onboarding (0–100). */
  onboardingPct: number;
  hasSubscription: boolean;
  /** Peor etapa de cobranza de sus cobros pendientes. */
  billing: "ok" | "grace" | "notice" | "suspendable";
  serviceSuspended: boolean;
  openTickets: number;
  breachedTickets: number;
  /** Calificaciones CSAT (1–5) de sus encuestas respondidas. */
  scores: number[];
};

export type HealthFactor = { key: string; label: string; points: number; max: number; reason: string; action: string | null };
export type HealthLevel = "healthy" | "watch" | "at_risk" | "critical";

export const HEALTH_LEVELS: Record<HealthLevel, { label: string; tone: "success" | "neutral" | "warning" | "danger" }> = {
  healthy: { label: "Saludable", tone: "success" },
  watch: { label: "En observación", tone: "neutral" },
  at_risk: { label: "En riesgo", tone: "warning" },
  critical: { label: "Crítica", tone: "danger" },
};

function activity(d: number | null): HealthFactor {
  const max = 25;
  if (d == null) return { key: "actividad", label: "Actividad", points: 0, max, reason: "Nunca ha registrado movimientos.", action: "Llamar para acompañar el primer uso." };
  const points = d <= 3 ? 25 : d <= 7 ? 20 : d <= 14 ? 12 : d <= 30 ? 5 : 0;
  return { key: "actividad", label: "Actividad", points, max, reason: d === 0 ? "Usó NEXUS hoy." : `Último movimiento hace ${d} ${d === 1 ? "día" : "días"}.`, action: points < 20 ? "Contactar: ¿qué le impide usarlo?" : null };
}

function adoption(pct: number): HealthFactor {
  const points = Math.round((Math.max(0, Math.min(100, pct)) / 100) * 20);
  return { key: "adopcion", label: "Adopción", points, max: 20, reason: `Puesta en marcha al ${Math.round(pct)} %.`, action: pct < 100 ? "Completar el siguiente paso del onboarding." : null };
}

function payments(f: HealthFacts): HealthFactor {
  const max = 25;
  if (f.serviceSuspended && f.billing !== "ok") return { key: "pagos", label: "Pagos", points: 0, max, reason: "Servicio suspendido por pagos.", action: "Acordar el pago y reactivar." };
  if (!f.hasSubscription) return { key: "pagos", label: "Pagos", points: 15, max, reason: "Sin suscripción creada.", action: "Crear su suscripción en Facturación." };
  const map = { ok: [25, "Pagos al día.", null], grace: [15, "Cobro vencido en periodo de gracia.", "Enviar recordatorio de pago."], notice: [5, "Cobro vencido con aviso de suspensión.", "Llamar antes de suspender."], suspendable: [0, "Cobro vencido: ya se puede suspender.", "Decidir: acuerdo de pago o suspensión."] } as const;
  const [points, reason, action] = map[f.billing];
  return { key: "pagos", label: "Pagos", points, max, reason, action };
}

function support(open: number, breached: number): HealthFactor {
  const max = 15;
  if (breached > 0) return { key: "soporte", label: "Soporte", points: 3, max, reason: `${breached} ${breached === 1 ? "ticket" : "tickets"} con SLA vencido.`, action: "Atender los tickets vencidos hoy." };
  const points = open === 0 ? 15 : open <= 2 ? 10 : 5;
  return { key: "soporte", label: "Soporte", points, max, reason: open === 0 ? "Sin tickets abiertos." : `${open} tickets abiertos.`, action: open > 2 ? "Revisar si hay un problema de fondo." : null };
}

function satisfaction(scores: number[]): HealthFactor {
  const max = 15;
  if (!scores.length) return { key: "satisfaccion", label: "Satisfacción", points: 10, max, reason: "Sin encuestas respondidas.", action: null };
  const avg = scores.reduce((s, x) => s + x, 0) / scores.length;
  const points = avg >= 4.5 ? 15 : avg >= 4 ? 12 : avg >= 3 ? 7 : 2;
  return { key: "satisfaccion", label: "Satisfacción", points, max, reason: `Calificación promedio ${avg.toFixed(1)} de 5 (${scores.length}).`, action: avg < 4 ? "Llamar para entender qué no le gustó." : null };
}

export function healthScore(f: HealthFacts) {
  const factors = [activity(f.daysSinceActivity), adoption(f.onboardingPct), payments(f), support(f.openTickets, f.breachedTickets), satisfaction(f.scores)];
  const score = factors.reduce((s, x) => s + x.points, 0);
  const level: HealthLevel = score >= 75 ? "healthy" : score >= 55 ? "watch" : score >= 35 ? "at_risk" : "critical";
  const actions = factors.filter((x) => x.action).sort((a, b) => b.max - b.points - (a.max - a.points));
  return { score, level, factors, nextAction: actions[0]?.action ?? null };
}
