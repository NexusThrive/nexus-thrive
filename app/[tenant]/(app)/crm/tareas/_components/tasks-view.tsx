"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
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

type Dialog = { kind: "new" } | { kind: "edit"; row: TaskRow } | null;

/** Tareas con fecha y responsable. Las vencidas se avisan arriba; «Mis tareas» son las asignadas a ti. */
export default function TasksView({ slug, mine, overdue, all, team, customers, projects = [], today, me }: { slug: string; mine: TaskRow[]; overdue: TaskRow[]; all: TaskRow[]; team: { id: string; name: string }[]; customers: { id: string; name: string }[]; projects?: { id: string; name: string }[]; today: string; me: string }) {
  const [view, setView] = useState<TaskView>("mine");
  const [dialog, setDialog] = useState<Dialog>(null);
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
        <button type="button" onClick={() => setDialog({ kind: "new" })} className={buttonVariants({ className: "ml-auto" })}>
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
        <EmptyState title={view === "mine" ? "No tienes tareas asignadas" : view === "overdue" ? "Nada vencido" : "Sin tareas abiertas"} description={view === "overdue" ? "Todo lo que tiene fecha va al día." : "Crea una para que nadie olvide el siguiente paso con un cliente."} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {rows.map((t) => (
            <li key={t.id} className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3">
              <button type="button" onClick={() => complete(t.id)} aria-label={`Completar: ${t.title}`} className="mt-0.5 size-5 shrink-0 rounded-md border border-border bg-card hover:border-accent" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-ui font-medium">{t.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  {t.dueDay ? <span className={t.overdue ? "font-medium text-danger" : undefined}>{t.overdue ? `Vencida · ${t.dueDay}` : t.dueDay === today ? "Hoy" : t.dueDay}</span> : <span>Sin fecha</span>}
                  {t.projectName ? <span>· Proyecto {t.projectName}</span> : null}
                  {t.customerName ? <span>· {t.customerName}</span> : null}
                  <span>· {t.assigneeId === me ? "Para ti" : (t.assigneeName ?? "Sin asignar")}</span>
                </p>
              </div>
              {t.overdue ? <Badge variant="destructive">Vencida</Badge> : null}
              <button type="button" onClick={() => setDialog({ kind: "edit", row: t })} aria-label={`Cambiar fecha o responsable: ${t.title}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>Cambiar</button>
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
                <Select {...c} name="customerId" defaultValue="">
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
