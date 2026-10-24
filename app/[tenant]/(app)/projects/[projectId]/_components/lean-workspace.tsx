"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { KpiCard } from "@/components/molecules/kpi-card";
import { EmptyState } from "@/components/molecules/empty-state";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { formatDateShort } from "@/lib/format";
import {
  NON_COMPLIANCE_CAUSES,
  calculatePpc,
  formatPlainDate,
  getNonComplianceBreakdown,
  isoWeekLabel,
  isoWeekOf,
  bogotaToday,
  mondayOf,
  nonComplianceCauseLabel,
  parsePlainDate,
  relativeWeekNumber,
  WINDOW_WEEKS,
  type CommitmentStatusValue,
  type NonComplianceCauseValue,
} from "@/lib/construction/lean-engine";
import type { ProjectPlanData } from "@/lib/tenant/db";
import {
  createLookaheadTaskAction,
  createWeeklyCommitmentAction,
  updateCommitmentStatusAction,
} from "../lean/actions";
import { inputClasses, labelClasses } from "@/components/atoms/input";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Select } from "@/components/atoms/select";

/** Partida del presupuesto para enlazar tareas y compromisos (opcional). */
export type BudgetItemOption = { id: string; label: string };

type ActionState = {
  status: "idle" | "ok" | "error";
  message?: string;
  errors?: Record<string, string[] | undefined>;
};
const IDLE: ActionState = { status: "idle" };

const inputClass =
  inputClasses;

function statusBadge(status: CommitmentStatusValue) {
  if (status === "COMPLETED") {
    return <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300">Cumplido</Badge>;
  }
  if (status === "FAILED") {
    return <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300">No cumplido</Badge>;
  }
  return <Badge variant="outline">Pendiente</Badge>;
}

function FieldError({ state, field }: { state: ActionState; field: string }) {
  const message = state.errors?.[field]?.[0];
  return message ? <span className="mt-1 block text-xs text-destructive">{message}</span> : null;
}

function FormMessage({ state }: { state: ActionState }) {
  if (state.status !== "error" || !state.message) return null;
  return <p role="alert" className="text-xs text-destructive">{state.message}</p>;
}

function BudgetItemField({ id, items }: { id: string; items: BudgetItemOption[] }) {
  if (items.length === 0) return null;
  return (
    <label htmlFor={id} className="block">
      <span className={labelClasses}>Partida del presupuesto (opcional)</span>
      <Select id={id} name="budgetItemId" defaultValue="">
        <option value="">Sin partida</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

/** Formulario de tarea del Lookahead: la semana se deriva de la fecha de inicio. */
function LookaheadTaskForm({
  tenantSlug,
  projectId,
  windowStart,
  items,
  onDone,
}: {
  tenantSlug: string;
  projectId: string;
  windowStart: string;
  items: BudgetItemOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createLookaheadTaskAction.bind(null, tenantSlug, projectId),
    IDLE,
  );
  const [startDate, setStartDate] = useState(windowStart);
  const window0 = parsePlainDate(windowStart);
  const start = parsePlainDate(startDate);
  const week = window0 && start ? relativeWeekNumber(window0, start) : 0;

  useEffect(() => {
    if (state.status === "ok") {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  return (
    <form action={action} className="grid gap-3 border-b border-border p-4 md:grid-cols-2">
      <input type="hidden" name="weekNumber" value={week} />
      <label htmlFor="la-code" className="block">
        <span className={labelClasses}>Código</span>
        <input id="la-code" name="code" required maxLength={20} placeholder="T-01" className={inputClass} />
        <FieldError state={state} field="code" />
      </label>
      <label htmlFor="la-responsible" className="block">
        <span className={labelClasses}>Responsable</span>
        <input id="la-responsible" name="responsible" required maxLength={80} placeholder="Maestro de obra" className={inputClass} />
        <FieldError state={state} field="responsible" />
      </label>
      <label htmlFor="la-description" className="block md:col-span-2">
        <span className={labelClasses}>Descripción</span>
        <input id="la-description" name="description" required maxLength={200} placeholder="Fundir placa de entrepiso nivel 2" className={inputClass} />
        <FieldError state={state} field="description" />
      </label>
      <label htmlFor="la-start" className="block">
        <span className={labelClasses}>
          Inicio {week >= 1 && week <= WINDOW_WEEKS ? `(semana W${week})` : "(fuera de la ventana de 6 semanas)"}
        </span>
        <input
          id="la-start"
          name="startDate"
          type="date"
          required
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className={inputClass}
        />
        <FieldError state={state} field="startDate" />
      </label>
      <label htmlFor="la-end" className="block">
        <span className={labelClasses}>Fin</span>
        <input id="la-end" name="endDate" type="date" required defaultValue={windowStart} className={inputClass} />
        <FieldError state={state} field="endDate" />
      </label>
      <BudgetItemField id="la-item" items={items} />
      <label htmlFor="la-notes" className="block">
        <span className={labelClasses}>Notas (opcional)</span>
        <input id="la-notes" name="notes" maxLength={300} className={inputClass} />
      </label>
      <label htmlFor="la-restricted" className="flex items-center gap-2 text-sm text-muted-foreground">
        <input id="la-restricted" name="isRestricted" type="checkbox" className="h-4 w-4 rounded border-border" />
        Tiene una restricción por liberar
      </label>
      <div className="flex items-center justify-end gap-2 md:col-span-2">
        <FormMessage state={state} />
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Guardar tarea"}
        </Button>
      </div>
    </form>
  );
}

/** Formulario de compromiso del plan semanal (WWP). */
function CommitmentForm({
  tenantSlug,
  projectId,
  weekStart,
  items,
  onDone,
}: {
  tenantSlug: string;
  projectId: string;
  weekStart: string;
  items: BudgetItemOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createWeeklyCommitmentAction.bind(null, tenantSlug, projectId),
    IDLE,
  );
  useEffect(() => {
    if (state.status === "ok") {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);

  return (
    <form action={action} className="grid gap-3 border-b border-border p-4 md:grid-cols-2">
      <label htmlFor="wc-description" className="block md:col-span-2">
        <span className={labelClasses}>Compromiso</span>
        <input id="wc-description" name="description" required maxLength={200} placeholder="Terminar mampostería del eje A" className={inputClass} />
        <FieldError state={state} field="description" />
      </label>
      <label htmlFor="wc-responsible" className="block">
        <span className={labelClasses}>Responsable</span>
        <input id="wc-responsible" name="responsible" required maxLength={80} className={inputClass} />
        <FieldError state={state} field="responsible" />
      </label>
      <label htmlFor="wc-week" className="block">
        <span className={labelClasses}>Semana (lunes)</span>
        <input id="wc-week" name="weekStartDate" type="date" required defaultValue={weekStart} className={inputClass} />
        <FieldError state={state} field="weekStartDate" />
      </label>
      <BudgetItemField id="wc-item" items={items} />
      <div className="flex items-end justify-end gap-2">
        <FormMessage state={state} />
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Guardar compromiso"}
        </Button>
      </div>
    </form>
  );
}

/** Evaluación de un compromiso: cumplido, o no cumplido con su causa (CNC). */
function CommitmentEvaluation({
  tenantSlug,
  projectId,
  commitmentId,
  current,
}: {
  tenantSlug: string;
  projectId: string;
  commitmentId: string;
  current: CommitmentStatusValue;
}) {
  const router = useRouter();
  const [failing, setFailing] = useState(false);
  const [state, action, pending] = useActionState(
    updateCommitmentStatusAction.bind(null, tenantSlug, projectId, commitmentId),
    IDLE,
  );
  // Cerrar el formulario al guardar se ajusta en el render (no en un efecto).
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.status === "ok") setFailing(false);
  }
  useEffect(() => {
    if (state.status === "ok") router.refresh();
  }, [state, router]);

  if (failing) {
    return (
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="status" value="FAILED" />
        <Select name="failureCause" required defaultValue="" aria-label="Causa de no cumplimiento" className="h-8 rounded-lg border border-border bg-card px-2 text-xs">
          <option value="">Causa…</option>
          {NON_COMPLIANCE_CAUSES.map((cause) => (
            <option key={cause.value} value={cause.value}>
              {cause.label}
            </option>
          ))}
        </Select>
        <input name="failureNotes" maxLength={300} placeholder="Nota" aria-label="Nota de no cumplimiento" className="h-8 w-36 rounded-lg border border-border bg-card px-2 text-xs" />
        <Button type="submit" size="sm" disabled={pending}>Guardar</Button>
        <button type="button" onClick={() => setFailing(false)} aria-label="Cancelar" className="rounded p-1 text-muted-foreground hover:bg-muted">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
        <FormMessage state={state} />
      </form>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {current !== "COMPLETED" ? (
        <form action={action}>
          <input type="hidden" name="status" value="COMPLETED" />
          <button type="submit" disabled={pending} className="rounded-lg border border-success/40 px-2 py-1 text-xs font-medium text-success transition hover:bg-success/10 disabled:opacity-50">
            Cumplido
          </button>
        </form>
      ) : null}
      {current !== "FAILED" ? (
        <button type="button" onClick={() => setFailing(true)} className={buttonVariants({ variant: "outline", size: "sm" })}>
          No cumplido
        </button>
      ) : null}
      {current !== "PENDING" ? (
        <form action={action}>
          <input type="hidden" name="status" value="PENDING" />
          <button type="submit" disabled={pending} className="rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted disabled:opacity-50">
            Reabrir
          </button>
        </form>
      ) : null}
      <FormMessage state={state} />
    </div>
  );
}

export default function LeanWorkspace({
  tenantSlug,
  projectId,
  plan,
  budgetItems,
}: {
  tenantSlug: string;
  projectId: string;
  plan: ProjectPlanData;
  budgetItems: BudgetItemOption[];
}) {
  const [openForm, setOpenForm] = useState<"task" | "commitment" | null>(null);
  const today = bogotaToday(new Date());
  const ppc = useMemo(() => calculatePpc(plan.commitments), [plan.commitments]);
  const cnc = useMemo(() => getNonComplianceBreakdown(plan.commitments), [plan.commitments]);
  const itemLabel = useMemo(() => new Map(budgetItems.map((item) => [item.id, item.label])), [budgetItems]);

  const week0 = isoWeekOf(today);
  const weekStart = formatPlainDate(mondayOf(today));
  const commitmentsWeek = useMemo(
    () => plan.commitments.filter((c) => c.weekNumber === week0.week && c.year === week0.year),
    [plan.commitments, week0],
  );
  const closeForm = () => setOpenForm(null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="PPC actual" value={`${ppc.ppc}%`} hint={`Sobre ${ppc.evaluated} compromiso(s) evaluado(s)`} />
        <KpiCard label="Compromisos de la semana" value={`${commitmentsWeek.length}`} hint={isoWeekLabel(week0.week, week0.year)} />
        <KpiCard label="Estado de compromisos" value={`${ppc.completed}/${ppc.total}`} hint={`Cumplidos/Total`} />
        <KpiCard label="Tareas Lookahead" value={`${plan.lookaheadTasks.length}`} hint={`${plan.lookaheadTasks.filter(t => t.isRestricted).length} con restricción`} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Matriz Lookahead — 6 semanas</p>
            <p className="text-xs text-muted-foreground">Ventana desde el lunes {formatDateShort(plan.windowStart)}</p>
          </div>
          {openForm !== "task" ? (
            <Button size="sm" onClick={() => setOpenForm("task")}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nueva tarea
            </Button>
          ) : null}
        </div>
        {openForm === "task" ? (
          <LookaheadTaskForm
            tenantSlug={tenantSlug}
            projectId={projectId}
            windowStart={plan.windowStart}
            items={budgetItems}
            onDone={closeForm}
          />
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Código</th>
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Descripción</th>
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Semana</th>
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Fechas</th>
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Responsable</th>
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Restricción</th>
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Notas</th>
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
                    <td className="px-3 py-2 text-foreground">
                      {task.description}
                      {task.budgetItemId && itemLabel.get(task.budgetItemId) ? (
                        <span className="block text-xs text-muted-foreground">{itemLabel.get(task.budgetItemId)}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">W{task.weekNumber}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {formatDateShort(task.startDate)} – {formatDateShort(task.endDate)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{task.responsible}</td>
                    <td className="px-3 py-2">
                      {task.isRestricted ? <Badge className="border-red-400/30 bg-red-400/10 text-red-700 dark:text-red-300">Sí</Badge> : <Badge variant="outline">No</Badge>}
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">WWP — Compromisos semanales</p>
            <p className="text-xs text-muted-foreground">Semana ISO-8601 · {isoWeekLabel(week0.week, week0.year)}</p>
          </div>
          {openForm !== "commitment" ? (
            <Button size="sm" onClick={() => setOpenForm("commitment")}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Nuevo compromiso
            </Button>
          ) : null}
        </div>
        {openForm === "commitment" ? (
          <CommitmentForm
            tenantSlug={tenantSlug}
            projectId={projectId}
            weekStart={weekStart}
            items={budgetItems}
            onDone={closeForm}
          />
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Descripción</th>
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Responsable</th>
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Estado</th>
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Causa CNC</th>
                <th className="h-11 whitespace-nowrap px-3.5 text-left text-xs font-semibold text-muted-foreground">Evaluar</th>
              </tr>
            </thead>
            <tbody>
              {commitmentsWeek.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8">
                    <EmptyState
                      title="Sin compromisos en esta semana"
                      description="Registra el WWP de la semana para medir PPC y CNC."
                    />
                  </td>
                </tr>
              ) : (
                commitmentsWeek.map((commitment) => (
                  <tr key={commitment.id} className="border-b border-border/60 align-top last:border-none">
                    <td className="px-3 py-2 text-foreground">
                      {commitment.description}
                      {commitment.budgetItemId && itemLabel.get(commitment.budgetItemId) ? (
                        <span className="block text-xs text-muted-foreground">{itemLabel.get(commitment.budgetItemId)}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{commitment.responsible}</td>
                    <td className="px-3 py-2">{statusBadge(commitment.status)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {commitment.status === "FAILED"
                        ? `${commitment.failureCause ? nonComplianceCauseLabel(commitment.failureCause as NonComplianceCauseValue) : "Sin causa registrada"}${commitment.failureNotes ? ` · ${commitment.failureNotes}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <CommitmentEvaluation
                        tenantSlug={tenantSlug}
                        projectId={projectId}
                        commitmentId={commitment.id}
                        current={commitment.status}
                      />
                    </td>
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
