import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader } from "@/components/molecules/page-header";
import { formatDateTime } from "@/lib/format";
import { getStaffContext } from "@/lib/ops/access";
import { listSurveys } from "@/lib/ops/satisfaction";
import { csat, nps, SCORE_LABELS } from "@/lib/ops/satisfaction-rules";
import { cn } from "@/lib/utils";
import Panel from "../_components/panel";

export const metadata: Metadata = { title: "Satisfacción · NEXUS Operations Center" };

/** Satisfacción del soporte: CSAT, NPS, distribución, por agente y comentarios. */
export default async function SatisfaccionPage() {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("tickets.view")) notFound();
  const surveys = await listSurveys();
  const answered = surveys.filter((s) => s.score != null);
  const scores = answered.map((s) => s.score!);
  const npsScores = answered.filter((s) => s.nps != null).map((s) => s.nps!);
  const rate = surveys.length ? Math.round((answered.length / surveys.length) * 100) : null;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: scores.filter((s) => s === n).length }));
  const agents = [...new Set(answered.map((s) => s.assigneeName ?? "Sin asignar"))].map((name) => {
    const mine = answered.filter((s) => (s.assigneeName ?? "Sin asignar") === name).map((s) => s.score!);
    return { name, count: mine.length, csat: csat(mine), avg: mine.reduce((a, b) => a + b, 0) / mine.length };
  });

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Clientes" title="Satisfacción" description="Encuestas que se generan al resolver cada ticket. CSAT = % de calificaciones 4 y 5." />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard label="CSAT" value={csat(scores) == null ? "—" : `${csat(scores)} %`} hint={`${answered.length} respuestas`} index={0} />
        <KpiCard label="NPS" value={nps(npsScores) == null ? "—" : String(nps(npsScores))} hint="Promotores − detractores" index={1} />
        <KpiCard label="Tasa de respuesta" value={rate == null ? "—" : `${rate} %`} hint={`${surveys.length} encuestas enviadas`} index={2} />
        <KpiCard label="Calificaciones bajas" value={scores.filter((s) => s <= 2).length} alert={scores.some((s) => s <= 2)} hint="1 y 2 de 5" index={3} />
      </div>
      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
        <Panel title="Distribución">
          <ul className="grid gap-2 p-[18px]">
            {dist.map((d) => (
              <li key={d.n} className="grid grid-cols-[88px_minmax(0,1fr)_32px] items-center gap-3 text-[13px]">
                <span>
                  {d.n} · {SCORE_LABELS[d.n]}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <span className={cn("block h-full rounded-full", d.n >= 4 ? "bg-success" : d.n === 3 ? "bg-accent" : "bg-danger")} style={{ width: `${scores.length ? (d.count / scores.length) * 100 : 0}%` }} />
                </span>
                <span className="text-right font-mono tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Por agente">
          <ul className="divide-y divide-border">
            {agents.map((a) => (
              <li key={a.name} className="flex items-center gap-3 px-[18px] py-2.5 text-[13px]">
                <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{a.count} resp.</span>
                <Badge tone={(a.csat ?? 0) >= 80 ? "success" : (a.csat ?? 0) >= 60 ? "warning" : "danger"}>CSAT {a.csat} %</Badge>
              </li>
            ))}
            {agents.length === 0 ? <li className="px-[18px] py-4 text-[13px] text-muted-foreground">Sin respuestas todavía.</li> : null}
          </ul>
        </Panel>
      </div>
      <Panel title="Respuestas recientes">
        <ul className="divide-y divide-border">
          {surveys.slice(0, 30).map((s) => (
            <li key={s.id} className="grid gap-1 px-[18px] py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <span className="min-w-0">
                <Link href={`/admin/soporte/${s.ticketId}`} className="block truncate text-[13.5px] font-medium hover:underline">
                  <span className="font-mono text-xs text-muted-foreground">{s.code}</span> {s.subject}
                </Link>
                <small className="block truncate text-xs text-muted-foreground">
                  {s.tenantName ?? "Sin negocio"} · {s.assigneeName ?? "sin asignar"} · {s.answeredAt ? `respondida ${formatDateTime(new Date(s.answeredAt))}` : "sin responder"}
                </small>
                {s.comment ? <p className="mt-1 text-[13px] italic">“{s.comment}”</p> : null}
              </span>
              {s.score != null ? <Badge tone={s.score >= 4 ? "success" : s.score === 3 ? "warning" : "danger"}>{s.score}/5 · {SCORE_LABELS[s.score]}</Badge> : <Badge tone="muted">Pendiente</Badge>}
            </li>
          ))}
          {surveys.length === 0 ? <li className="px-[18px] py-6 text-center text-sm text-muted-foreground">Al resolver un ticket se genera su encuesta.</li> : null}
        </ul>
      </Panel>
    </div>
  );
}
