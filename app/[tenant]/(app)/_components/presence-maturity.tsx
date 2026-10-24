import Link from "next/link";
import { Badge } from "@/components/atoms/badge";
import type { Maturity } from "@/lib/presence/maturity";

const LEVEL = { INICIAL: "Inicial", EN_CRECIMIENTO: "En crecimiento", CONSOLIDADO: "Consolidado" } as const;

/** Presencia v2, fase B: cuánto del negocio ya opera en NEXUS, con una acción sugerida por cada señal débil. */
export default function PresenceMaturity({ maturity, slug }: { maturity: Maturity; slug: string }) {
  return (
    <section aria-labelledby="maturity-title" className="grid gap-4 rounded-lg border border-border bg-surface p-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 id="maturity-title" className="font-display text-[15px] font-semibold">Madurez NEXUS · Fase B</h2>
        <Badge variant={maturity.level === "CONSOLIDADO" ? "gold" : "outline"}>{LEVEL[maturity.level]}</Badge>
        <p className="ml-auto font-display text-3xl font-bold tabular-nums">{maturity.score}<span className="text-base text-muted-foreground">/100</span></p>
      </header>
      <ul className="grid gap-2.5">
        {maturity.dimensions.map((d) => (
          <li key={d.key} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-[13.5px]"><span className="font-medium">{d.label}</span><span className="font-mono tabular-nums">{d.score}</span></div>
            <div role="progressbar" aria-label={d.label} aria-valuenow={d.score} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-border"><div style={{ width: `${d.score}%` }} className="h-full bg-accent" /></div>
            <p className="text-xs text-muted-foreground">{d.detail}</p>
          </li>
        ))}
      </ul>
      {maturity.signals.length ? (
        <div className="grid gap-2">
          <h3 className="text-[13px] font-semibold">Qué hacer ahora</h3>
          <ul className="grid gap-2">
            {maturity.signals.map((s) => (
              <li key={s.key} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-[13.5px]">
                <span>{s.message}</span>
                <Link href={`/${slug}${s.action.href}`} className="ml-auto font-medium underline underline-offset-2">{s.action.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : <p className="text-[13px] text-muted-foreground">Usas NEXUS en todas sus áreas. Sigue así.</p>}
    </section>
  );
}
