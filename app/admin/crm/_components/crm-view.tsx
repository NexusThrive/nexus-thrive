"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CalendarClock, MoreHorizontal, Plus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/molecules/dropdown-menu";
import { EmptyState } from "@/components/molecules/empty-state";
import { KpiCard } from "@/components/molecules/kpi-card";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { followUpState, isActiveStage, LEAD_STAGES, pipelineSummary, stageMeta, type LeadStageValue } from "@/lib/ops/crm-rules";
import type { LeadRow } from "@/lib/ops/leads";
import { formatUsdCents } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";
import { moveLeadAction } from "../actions";
import LeadSheet, { type Option } from "./lead-sheet";

const FOLLOW = {
  overdue: "text-danger",
  today: "text-accent-text",
  upcoming: "text-muted-foreground",
  none: "text-muted-foreground",
} as const;

function shortDate(d: string, today: string) {
  if (d === today) return "Hoy";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
}

function LeadCard({ lead, today, canEdit }: { lead: LeadRow; today: string; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const follow = followUpState(lead.stage, lead.nextStepDate, today);
  const move = (stage: LeadStageValue) =>
    start(async () => {
      const r = await moveLeadAction(lead.id, stage);
      if (r.ok) {
        toast(`${lead.company} → ${stageMeta(stage).short}`, "success");
        router.refresh();
      } else toast({ title: "No se movió", description: r.message, variant: "error" });
    });
  return (
    <li className={cn("group relative rounded-md border border-border bg-surface p-3 transition-[border-color,opacity]", pending && "opacity-60", follow === "overdue" && "border-l-2 border-l-danger")}>
      <Link href={`/admin/crm/${lead.id}`} className="grid gap-1 pr-6">
        <b className="truncate text-[13.5px] font-medium">{lead.company}</b>
        <small className="truncate text-xs text-muted-foreground">
          {[lead.contactName, lead.city].filter(Boolean).join(" · ") || lead.source}
        </small>
        {lead.nextStep ? (
          <small className={cn("mt-1 flex items-center gap-1 text-xs", FOLLOW[follow])}>
            <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">
              {lead.nextStepDate ? `${shortDate(lead.nextStepDate, today)} · ` : ""}
              {lead.nextStep}
            </span>
          </small>
        ) : null}
        <span className="mt-1 flex items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
          <span className="truncate">{lead.ownerName ?? <span className="text-danger">Sin responsable</span>}</span>
          {lead.valueUsdCents ? <span className="font-mono tabular-nums text-foreground">{formatUsdCents(lead.valueUsdCents)}/mes</span> : null}
        </span>
      </Link>
      {canEdit && isActiveStage(lead.stage) ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Mover ${lead.company}`} className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground">
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Mover a</DropdownMenuLabel>
            {LEAD_STAGES.filter((s) => isActiveStage(s.value) && s.value !== lead.stage).map((s) => (
              <DropdownMenuItem key={s.value} onSelect={() => move(s.value)}>
                <ArrowRight aria-hidden="true" />
                {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <Link href={`/admin/crm/${lead.id}`}>Ganar o perder…</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}

/**
 * CRM comercial: indicadores, tablero por etapa (escritorio) y lista por
 * etapa (celular). "Míos" filtra por responsable; los vencidos se marcan.
 */
export default function CrmView({
  leads,
  owners,
  tenants,
  me,
  today,
  canEdit,
  canAssign,
}: {
  leads: LeadRow[];
  owners: Option[];
  tenants: Option[];
  me: string;
  today: string;
  canEdit: boolean;
  canAssign: boolean;
}) {
  const params = useSearchParams();
  const [creating, setCreating] = useState(params.get("nuevo") === "1");
  const [mine, setMine] = useState(false);
  const [closed, setClosed] = useState(false);
  const [mobileStage, setMobileStage] = useState<LeadStageValue>("NEW");
  const visible = leads.filter((l) => !mine || l.ownerId === me);
  const summary = pipelineSummary(visible);
  const overdue = visible.filter((l) => followUpState(l.stage, l.nextStepDate, today) === "overdue").length;
  const stages = LEAD_STAGES.filter((s) => closed || isActiveStage(s.value));
  const column = (stage: LeadStageValue) =>
    visible
      .filter((l) => l.stage === stage)
      .sort((a, b) => (a.nextStepDate ?? "9999").localeCompare(b.nextStepDate ?? "9999"));

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard label="Leads activos" value={summary.activeCount} index={0} />
        <KpiCard label="Valor ponderado" value={formatUsdCents(summary.weightedCents)} hint="USD/mes según la etapa" index={1} />
        <KpiCard label="Seguimientos vencidos" value={overdue} alert={overdue > 0} index={2} />
        <KpiCard label="Tasa de cierre" value={summary.winRatePct == null ? "—" : `${summary.winRatePct} %`} hint="Ganados sobre cerrados" index={3} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ChipRow>
          <Chip selected={mine} onClick={() => setMine(!mine)}>
            Solo míos
          </Chip>
          <Chip selected={closed} onClick={() => setClosed(!closed)}>
            Ver ganados y perdidos
          </Chip>
        </ChipRow>
        {canEdit ? (
          <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "ml-auto" })}>
            <Plus aria-hidden="true" className="size-4" /> Nuevo lead
          </button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState title="Todavía no hay leads" description="Registra el primer prospecto y su próximo paso." />
        </div>
      ) : (
        <>
          {/* Escritorio: tablero por etapa con desplazamiento horizontal. */}
          <div className="hidden overflow-x-auto pb-2 md:block">
            <div className="grid auto-cols-[minmax(232px,1fr)] grid-flow-col gap-3">
              {stages.map((s) => {
                const items = column(s.value);
                const value = items.reduce((t, l) => t + l.valueUsdCents, 0);
                return (
                  <section key={s.value} aria-label={s.label} className="flex min-h-40 flex-col rounded-lg bg-surface-muted p-2.5">
                    <header className="mb-2 flex items-baseline justify-between gap-2 px-1">
                      <h2 className="truncate text-[12.5px] font-semibold">{s.label}</h2>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {items.length}
                        {value ? ` · ${formatUsdCents(value)}` : ""}
                      </span>
                    </header>
                    <ul className="grid content-start gap-2">
                      {items.map((l) => (
                        <LeadCard key={l.id} lead={l} today={today} canEdit={canEdit} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>

          {/* Celular: una etapa a la vez. */}
          <div className="grid gap-3 md:hidden">
            <div className="overflow-x-auto [scrollbar-width:none]">
              <SegmentedControl
                ariaLabel="Etapa"
                size="sm"
                value={mobileStage}
                onChange={setMobileStage}
                options={stages.map((s) => ({ value: s.value, label: s.short, count: column(s.value).length }))}
              />
            </div>
            <ul className="grid gap-2">
              {column(mobileStage).map((l) => (
                <LeadCard key={l.id} lead={l} today={today} canEdit={canEdit} />
              ))}
              {column(mobileStage).length === 0 ? <li className="py-8 text-center text-sm text-muted-foreground">Nada en esta etapa.</li> : null}
            </ul>
          </div>
        </>
      )}

      {creating ? <LeadSheet lead={null} open onOpenChange={setCreating} owners={owners} tenants={tenants} me={me} today={today} canAssign={canAssign} /> : null}
    </div>
  );
}
