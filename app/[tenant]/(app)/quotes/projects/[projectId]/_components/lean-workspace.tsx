"use client";

import { useMemo } from "react";
import { KpiCard } from "@/components/brand/kpi-card";
import { EmptyState } from "@/components/brand/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/format";
import {
  calculatePpc,
  getNonComplianceBreakdown,
  isoWeekLabel,
  isoWeekOf,
  bogotaToday,
  type CommitmentStatusValue,
} from "@/lib/lean-engine";
import type { ProjectPlanData } from "@/lib/tenant-db";

function statusBadge(status: CommitmentStatusValue) {
  if (status === "COMPLETED") {
    return <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">Cumplido</Badge>;
  }
  if (status === "FAILED") {
    return <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-300">No cumplido</Badge>;
  }
  return <Badge variant="outline">Pendiente</Badge>;
}

export default function LeanWorkspace({
  _tenantSlug,
  _projectId,
  plan,
}: {
  _tenantSlug: string;
  _projectId: string;
  plan: ProjectPlanData;
}) {
  const today = bogotaToday(new Date());
  const ppc = useMemo(() => calculatePpc(plan.commitments), [plan.commitments]);
  const cnc = useMemo(() => getNonComplianceBreakdown(plan.commitments), [plan.commitments]);

  const week0 = isoWeekOf(today);
  const commitmentsWeek = useMemo(
    () => plan.commitments.filter((c) => c.weekNumber === week0.week && c.year === week0.year),
    [plan.commitments, week0],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="PPC actual" value={`${ppc.ppc}%`} hint={`Sobre ${ppc.evaluated} compromiso(s) evaluado(s)`} />
        <KpiCard label="Compromisos de la semana" value={`${commitmentsWeek.length}`} hint={isoWeekLabel(week0.week, week0.year)} />
        <KpiCard label="Estado de compromisos" value={`${ppc.completed}/${ppc.total}`} hint={`Cumplidos/Total`} />
        <KpiCard label="Tareas Lookahead" value={`${plan.lookaheadTasks.length}`} hint={`${plan.lookaheadTasks.filter(t => t.isRestricted).length} con restricción`} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Matriz Lookahead — 6 semanas</p>
            <p className="text-xs text-muted-foreground">Ventana anclada al lunes de la semana operativa</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>Actualizar</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Código</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Descripción</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Semana</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Fechas</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Responsable</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Restricción</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Notas</th>
              </tr>
            </thead>
            <tbody>
              {plan.lookaheadTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8">
                    <EmptyState
                      title="Sin tareas en Lookahead"
                      description="Crea la primera tarea de la ventana de 6 semanas para iniciar la planificación."
                    />
                  </td>
                </tr>
              ) : (
                plan.lookaheadTasks.map((task) => (
                  <tr key={task.id} className="border-b border-border/60 last:border-none">
                    <td className="px-3 py-2 font-mono text-xs text-foreground">{task.code}</td>
                    <td className="px-3 py-2 text-foreground">{task.description}</td>
                    <td className="px-3 py-2 text-muted-foreground">W{task.weekNumber}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDateShort(task.startDate)} – {formatDateShort(task.endDate)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{task.responsible}</td>
                    <td className="px-3 py-2">
                      {task.isRestricted ? <Badge className="border-red-400/30 bg-red-400/10 text-red-300">Sí</Badge> : <Badge variant="outline">No</Badge>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{task.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">WWP — Compromisos semanales</p>
            <p className="text-xs text-muted-foreground">Semana ISO-8601 · {isoWeekLabel(week0.week, week0.year)}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Descripción</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Responsable</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Semana</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Estado</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Causa CNC</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">Notas</th>
              </tr>
            </thead>
            <tbody>
              {commitmentsWeek.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8">
                    <EmptyState
                      title="Sin compromisos en esta semana"
                      description="Registra el WWP de la semana para medir PPC y CNC."
                    />
                  </td>
                </tr>
              ) : (
                commitmentsWeek.map((commitment) => (
                  <tr key={commitment.id} className="border-b border-border/60 last:border-none">
                    <td className="px-3 py-2 text-foreground">{commitment.description}</td>
                    <td className="px-3 py-2 text-muted-foreground">{commitment.responsible}</td>
                    <td className="px-3 py-2 text-muted-foreground">{isoWeekLabel(commitment.weekNumber, commitment.year)}</td>
                    <td className="px-3 py-2">{statusBadge(commitment.status)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {commitment.status === "FAILED" ? (commitment.failureCause ?? "Sin causa registrada") : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{commitment.failureNotes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cnc.total > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Distribución CNC — {cnc.total} compromiso(s) no cumplido(s)</p>
          <div className="mt-3 space-y-2">
            {cnc.entries.map((entry) => (
              <div key={entry.cause ?? "none"} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{entry.label}</span>
                <span className="font-medium text-foreground">{entry.count} · {entry.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
