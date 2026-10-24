"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { EmptyState } from "@/components/molecules/empty-state";
import { KpiCard } from "@/components/molecules/kpi-card";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { followUpState, isActiveStage, LEAD_STAGES, pipelineSummary, stageMeta, type LeadStageValue } from "@/lib/ops/crm-rules";
import { formatUsdCents } from "@/lib/plans/pricing";
import { moveLeadAction } from "../actions";
import type { LeadRow } from "@/lib/ops/leads";
import LeadBoard, { LeadCard } from "./lead-board";
import LeadSheet, { type Option } from "./lead-sheet";

/**
 * CRM comercial: indicadores, tablero por etapa (escritorio) y lista por
 * etapa (celular). "Míos" filtra por responsable; los vencidos se marcan.
 */
export default function CrmView({
  leads: serverLeads,
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
  const router = useRouter();
  const { toast } = useToast();
  // Estado visual inmediato: el lead cambia de columna al soltarlo; si el
  // servidor rechaza, al terminar la transición vuelve a lo que dicen los datos.
  const [leads, applyMove] = useOptimistic(serverLeads, (current, move: { id: string; stage: LeadStageValue }) =>
    current.map((l) => (l.id === move.id ? { ...l, stage: move.stage } : l)),
  );
  const [savingIds, setSavingIds] = useState<ReadonlySet<string>>(new Set());
  const [, startMove] = useTransition();

  /** Un solo camino para arrastrar y para el menú «Mover a»: una acción por movimiento. */
  function moveLead(lead: LeadRow, stage: LeadStageValue) {
    if (lead.stage === stage) return;
    setSavingIds((ids) => new Set(ids).add(lead.id));
    startMove(async () => {
      applyMove({ id: lead.id, stage });
      let r: Awaited<ReturnType<typeof moveLeadAction>>;
      try {
        r = await moveLeadAction(lead.id, stage, lead.stage);
      } catch {
        // Pestaña con una versión vieja de la app (tras un despliegue o al
        // reiniciar el servidor) o sin red: la acción no se encuentra o no llega.
        r = { ok: false, message: "No se pudo contactar al servidor. Recarga la página (la app pudo actualizarse) e inténtalo de nuevo." };
      }
      setSavingIds((ids) => {
        const next = new Set(ids);
        next.delete(lead.id);
        return next;
      });
      if (r.ok) toast(`${lead.company} → ${stageMeta(stage).short}`, "success");
      else toast({ title: "No se movió", description: r.message, variant: "error" });
      router.refresh(); // también tras un error: trae el estado real (p. ej. conflicto)
    });
  }

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
          {/* Escritorio: tablero por etapa; los leads se arrastran entre etapas activas. */}
          <div className="hidden overflow-x-auto pb-2 md:block">
            <LeadBoard
              leads={visible}
              stages={stages.map((s) => ({ value: s.value, label: s.label }))}
              today={today}
              canEdit={canEdit}
              savingIds={savingIds}
              onMove={moveLead}
            />
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
                <LeadCard key={l.id} lead={l} today={today} canEdit={canEdit} saving={savingIds.has(l.id)} onMove={moveLead} />
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
