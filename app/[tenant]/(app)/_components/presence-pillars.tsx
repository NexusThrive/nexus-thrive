import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import type { Pillar, PhaseA, Trend } from "@/lib/presence/pillars";

const TREND = { up: { icon: ArrowUpRight, text: "Sube", tone: "text-success" }, flat: { icon: ArrowRight, text: "Estable", tone: "text-muted-foreground" }, down: { icon: ArrowDownRight, text: "Baja", tone: "text-danger" } } as const;

/**
 * Presencia v2, fase A: visibilidad VERIFICADA por pilares. Un pilar que aún no se puede medir se muestra
 * «sin medir» (no se rellena); la cobertura dice cuánto de la barra ya es medible. La tendencia compara con hace ~30 días.
 */
export default function PresencePillars({ pillars, phase, trend }: { pillars: Pillar[]; phase: PhaseA; trend: Trend }) {
  const t = TREND[trend.direction];
  const TrendIcon = t.icon;
  const max = Math.max(1, ...trend.series.map((s) => s.score));
  return (
    <section aria-labelledby="pillars-title" className="grid gap-4 rounded-lg border border-border bg-surface p-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 id="pillars-title" className="font-display text-[15px] font-semibold">Visibilidad verificada · Fase A</h2>
        <Badge variant={phase.phase === "B_READY" ? "gold" : "outline"}>{phase.phase === "B_READY" ? "Lista para la fase B (madurez NEXUS)" : `Cobertura ${phase.coverage} %`}</Badge>
        <span className={`ml-auto inline-flex items-center gap-1 text-[13px] font-medium ${t.tone}`}>
          <TrendIcon aria-hidden="true" className="size-4" />
          {t.text}
          {trend.days > 0 ? ` ${trend.delta > 0 ? "+" : ""}${trend.delta} pts en ${trend.days} días` : ""}
        </span>
      </header>
      <div className="flex items-end gap-6">
        <p className="font-display text-5xl font-bold tabular-nums">{phase.score}<span className="text-xl text-muted-foreground">/100</span></p>
        {trend.series.length > 1 ? (
          <ul aria-label="Evolución de los últimos días" className="flex h-12 flex-1 items-end gap-0.5">
            {trend.series.map((s) => (
              <li key={s.day} title={`${s.day}: ${s.score}`} style={{ height: `${Math.max(6, (s.score / max) * 100)}%` }} className="w-full max-w-2 rounded-sm bg-accent/70" />
            ))}
          </ul>
        ) : null}
      </div>
      <ul className="grid gap-3">
        {pillars.map((p) => (
          <li key={p.key} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-[13.5px]">
              <span className="font-medium">{p.label}{!p.verified ? <small className="ml-2 font-normal text-muted-foreground">declarado</small> : null}</span>
              <span className="font-mono tabular-nums text-muted-foreground">{p.score === null ? "Sin medir" : `${p.score} / 100`}</span>
            </div>
            {p.score === null ? (
              <div className="h-1.5 rounded-full border border-dashed border-border" aria-hidden="true" />
            ) : (
              <div role="progressbar" aria-label={`${p.label}: ${p.score} de 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.score} className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full bg-accent" style={{ width: `${p.score}%` }} />
              </div>
            )}
            <p className="text-xs text-muted-foreground">{p.hint}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
