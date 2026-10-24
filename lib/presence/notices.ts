import type { Maturity } from "./maturity";
import type { Pillar, Trend } from "./pillars";

/**
 * Avisos de Presencia (reglas puras): el cambio de fase y el reporte semanal. Lo que se emite es un EVENTO con datos
 * ya redactados; el canal (WhatsApp, correo) lo decide quien lo recibe (n8n o un webhook), nunca esta función.
 */
export type Phase = "A" | "B_READY";

export const phaseChangeNotice = (before: Phase | null, after: Phase): { title: string; message: string } | null => {
  if (before === null || before === after) return null;
  return after === "B_READY"
    ? { title: "Tu presencia está lista para la fase B", message: "Todos tus pilares están medidos y altos. Ahora NEXUS mide cuánto de tu negocio opera dentro de la plataforma." }
    : { title: "Tu presencia salió de la fase B", message: "Algún pilar bajó de 80 o dejó de medirse. Revisa cuál en Presence Thrive." };
};

/** Semana ISO («2026-W43») de un día `YYYY-MM-DD`: llave para no mandar dos reportes en la misma semana. */
export function isoWeek(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - dow + 3); // jueves de esa semana
  const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const n = 1 + Math.round(((d.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(n).padStart(2, "0")}`;
}

export type WeeklyReport = { week: string; score: number; coverage: number; trend: string; weakest: { label: string; score: number; hint: string }[]; unmeasured: string[]; actions: { message: string; href: string }[]; text: string };

/** Reporte semanal: puntaje, tendencia, los dos pilares más débiles, lo que falta medir y las acciones de la madurez. */
export function weeklyReport(i: { day: string; score: number; coverage: number; pillars: readonly Pillar[]; trend: Trend; maturity: Maturity | null }): WeeklyReport {
  const measured = i.pillars.filter((p): p is Pillar & { score: number } => p.score !== null);
  const weakest = [...measured].sort((a, b) => a.score - b.score).slice(0, 2).filter((p) => p.score < 80).map((p) => ({ label: p.label, score: p.score, hint: p.hint }));
  const unmeasured = i.pillars.filter((p) => p.score === null).map((p) => p.label);
  const trend = i.trend.days > 0 ? `${i.trend.direction === "up" ? "Sube" : i.trend.direction === "down" ? "Baja" : "Estable"} (${i.trend.delta > 0 ? "+" : ""}${i.trend.delta} pts en ${i.trend.days} días)` : "Aún sin comparación";
  const actions = (i.maturity?.signals ?? []).slice(0, 3).map((s) => ({ message: s.message, href: s.action.href }));
  const lines = [`Presencia ${i.score}/100 · cobertura ${i.coverage} % · ${trend}.`, ...weakest.map((w) => `Mejorar ${w.label} (${w.score}): ${w.hint}`), ...(unmeasured.length ? [`Sin medir: ${unmeasured.join(", ")}.`] : []), ...actions.map((a) => a.message)];
  return { week: isoWeek(i.day), score: i.score, coverage: i.coverage, trend, weakest, unmeasured, actions, text: lines.join("\n") };
}
