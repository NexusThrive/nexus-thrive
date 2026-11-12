"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Plus } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { DateInput } from "@/components/molecules/date-input";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { completeTaskAction, createTaskAction, rescheduleTaskAction, type TaskResult } from "@/app/[tenant]/(app)/crm/tareas/actions";
import type { TaskRow } from "@/lib/business/customers/tasks-db";
import type { TaskView } from "@/lib/business/customers/tasks";
import { cn } from "@/lib/utils";

type Dialog = { kind: "new" } | { kind: "edit"; row: TaskRow } | null;

/** Tareas con fecha y responsable. Las vencidas se avisan arriba; «Mis tareas» son las asignadas a ti. */
export default function TasksView({ slug, mine, overdue, all, team, customers, projects = [], today, me, initialCustomerId }: { initialCustomerId?: string; slug: string; mine: TaskRow[]; overdue: TaskRow[]; all: TaskRow[]; team: { id: string; name: string }[]; customers: { id: string; name: string }[]; projects?: { id: string; name: string }[]; today: string; me: string }) {
  const [view, setView] = useState<TaskView>("mine");
  // `?nuevo=1&cliente=` (desde la ficha del cliente) abre la tarea con el cliente elegido.
  const [dialog, setDialog] = useState<Dialog>(initialCustomerId ? { kind: "new" } : null);
  const router = useRouter();
  const { toast } = useToast();
  const [project, setProject] = useState("");
  const [person, setPerson] = useState("");
  const base = view === "mine" ? mine : view === "overdue" ? overdue : all;
  const rows = base.filter((t) => (!project || t.projectId === project) && (!person || t.assigneeId === person));
  const myOverdue = mine.filter((t) => t.overdue).length;
  const done = (message?: string) => {
    if (message) toast(message, "success");
    router.refresh();
  };
  const complete = async (id: string) => {
    const r: TaskResult = await completeTaskAction(slug, id);
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
  };
  return (
    <div className="grid gap-4">
      {myOverdue > 0 ? (
        <Alert tone="warning">{myOverdue === 1 ? "Tienes 1 tarea vencida." : `Tienes ${myOverdue} tareas vencidas.`} Hazlas hoy o cámbiales la fecha.</Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentedControl ariaLabel="Vista" value={view} onChange={setView} options={[{ value: "mine", label: "Mis tareas", count: mine.length || undefined }, { value: "overdue", label: "Vencidas", count: overdue.length || undefined }, { value: "all", label: "Todas" }]} />
        </div>
        <button type="button" onClick={() => setDialog({ kind: "new" })} className={cn(buttonVariants({ variant: "accent" }), "ml-auto h-11 rounded-full px-6 text-sm font-semibold")}>
          <Plus aria-hidden="true" className="size-4" /> Nueva tarea
        </button>
      </div>

      {projects.length > 0 || view !== "mine" ? (
        <div className="flex flex-wrap gap-2">
          {projects.length > 0 ? (
            <Select aria-label="Filtrar por proyecto" value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">Todos los proyectos</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          ) : null}
          {view !== "mine" ? (
            <Select aria-label="Filtrar por persona" value={person} onChange={(e) => setPerson(e.target.value)}>
              <option value="">Todas las personas</option>
              {team.map((u) => <option key={u.id} value={u.id}>{u.id === me ? `${u.name} (yo)` : u.name}</option>)}
            </Select>
          ) : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          mark="center"
          remember={false}
          icon={<Check />}
          title={view === "mine" ? "No tienes tareas asignadas" : view === "overdue" ? "Nada vencido" : "Sin tareas abiertas"}
          description={view === "overdue" ? "Todo lo que tiene fecha va al día." : "Crea una para que nadie olvide el siguiente paso con un cliente."}
          action={
            view === "overdue" ? undefined : (
              <button type="button" onClick={() => setDialog({ kind: "new" })} className={cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold")}>
                <Plus aria-hidden="true" className="size-4" /> Nueva tarea
              </button>
            )
          }
        />
      ) : (
        <ul className="grid gap-2.5">
          {rows.map((t) => (
            <li key={t.id} className="nx-rise flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface-muted/60 px-5 py-4">
              <button type="button" onClick={() => complete(t.id)} aria-label={`Completar: ${t.title}`} className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-border-strong bg-card text-transparent outline-none transition-colors hover:border-accent hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="break-words text-ui font-medium text-foreground">{t.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5", t.overdue ? "bg-danger/10 font-medium text-danger" : "bg-card")}>
                    <CalendarClock aria-hidden="true" className="size-3" />
                    {t.dueDay ? (t.overdue ? `Vencida · ${t.dueDay}` : t.dueDay === today ? "Hoy" : t.dueDay) : "Sin fecha"}
                  </span>
                  {t.projectName ? <span>Proyecto {t.projectName}</span> : null}
                  {t.customerName ? <span>· {t.customerName}</span> : null}
                  <span>· {t.assigneeId === me ? "Para ti" : (t.assigneeName ?? "Sin asignar")}</span>
                </p>
              </div>
              <button type="button" onClick={() => setDialog({ kind: "edit", row: t })} aria-label={`Cambiar fecha o responsable: ${t.title}`} className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full border-border/60 bg-card px-4 text-sm")}>
                Cambiar
              </button>
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={dialog?.kind === "new"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Nueva tarea"
        description="Un paso concreto, con fecha y responsable."
        submitLabel="Crear"
        pendingLabel="Creando…"
        onSubmit={async (d) => {
          const r = await createTaskAction(slug, { title: String(d.get("title") ?? ""), dueDay: String(d.get("dueDay") ?? ""), assigneeId: String(d.get("assigneeId") ?? ""), customerId: String(d.get("customerId") ?? ""), projectId: String(d.get("projectId") ?? ""), notes: String(d.get("notes") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { title: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Qué hay que hacer" required error={fieldErrors.title}>{(c) => <input {...c} name="title" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Ej.: Llamar a Camila para confirmar el diseño" />}</Field>
            <Field label="Para cuándo">{(c) => <DateInput {...c} name="dueDay" defaultValue={today} />}</Field>
            <Field label="Responsable">
              {(c) => (
                <Select {...c} name="assigneeId" defaultValue={me}>
                  <option value="">Sin asignar</option>
                  {team.map((u) => <option key={u.id} value={u.id}>{u.id === me ? `${u.name} (yo)` : u.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Contacto">
              {(c) => (
                <Select {...c} name="customerId" defaultValue={initialCustomerId && customers.some((x) => x.id === initialCustomerId) ? initialCustomerId : ""}>
                  <option value="">Ninguno</option>
                  {customers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              )}
            </Field>
            {projects.length > 0 ? (
              <Field label="Proyecto">
                {(c) => (
                  <Select {...c} name="projectId" defaultValue="">
                    <option value="">Ninguno</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                )}
              </Field>
            ) : null}
            <Field label="Notas">{(c) => <input {...c} name="notes" autoComplete="off" maxLength={500} className={inputClasses} />}</Field>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={dialog?.kind === "edit"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Cambiar la tarea"
        description={dialog?.kind === "edit" ? dialog.row.title : undefined}
        submitLabel="Guardar"
        pendingLabel="Guardando…"
        onSubmit={async (d) => {
          const r = await rescheduleTaskAction(slug, (dialog as { row: TaskRow }).row.id, String(d.get("dueDay") ?? ""), String(d.get("assigneeId") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {() => (
          <div className="grid gap-3">
            <Field label="Para cuándo">{(c) => <DateInput {...c} name="dueDay" defaultValue={dialog?.kind === "edit" ? (dialog.row.dueDay ?? today) : today} />}</Field>
            <Field label="Responsable">
              {(c) => (
                <Select {...c} name="assigneeId" defaultValue={dialog?.kind === "edit" ? (dialog.row.assigneeId ?? "") : ""}>
                  <option value="">Sin asignar</option>
                  {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              )}
            </Field>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
