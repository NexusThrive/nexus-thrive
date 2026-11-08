"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CheckSquare, FileCheck2, Link2, Trash2, X } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { FormDialog } from "@/components/organisms/form-sheet";
import {
  addReasonAction,
  addTagAction,
  createStageAction,
  deleteReasonAction,
  deleteStageAction,
  deleteTagAction,
  deleteTeamAction,
  moveStageOrderAction,
  renameReasonAction,
  saveTeamAction,
  updateStageAction,
} from "../actions";
import type { crmConfig } from "@/lib/business/growth/pipeline-config-db";
import { cn } from "@/lib/utils";

type Data = Awaited<ReturnType<typeof crmConfig>>;
const card = "rounded-xl border border-border bg-card p-[22px]";
const iconBtn = "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";

/**
 * Configuración del CRM. Las etapas se crean, renombran, reordenan y fijan su probabilidad por defecto (la ganada queda al final con
 * 100 %); los motivos de pérdida, las etiquetas y los equipos se mantienen aquí. Sin permiso, solo lectura.
 */
export default function CrmConfigView({ slug, data, canEdit }: { slug: string; data: Data; canEdit: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, start] = useTransition();
  const [team, setTeam] = useState<null | { id: string | null; name: string; memberIds: string[] }>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      toast(r.ok ? (r.message ?? "Guardado") : (r.message ?? "No se pudo"), r.ok ? "success" : "error");
      if (r.ok) router.refresh();
    });
  const open = data.stages.filter((s) => !s.isWon);

  /** Campo que guarda al salir o con Enter si cambió. */
  const blurSave = (current: string, save: (v: string) => void) => ({
    defaultValue: current,
    disabled: !canEdit || pending,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && e.currentTarget.blur(),
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.value.trim() !== current && save(e.currentTarget.value),
  });

  const addRow = (label: string, placeholder: string, onAdd: (v: string) => void) => (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem("nombre") as HTMLInputElement;
        if (input.value.trim()) onAdd(input.value);
        input.value = "";
      }}
    >
      <label className="sr-only" htmlFor={`add-${label}`}>
        {label}
      </label>
      <input id={`add-${label}`} name="nombre" placeholder={placeholder} disabled={!canEdit} className={cn(inputClasses, "h-9")} />
      <button type="submit" disabled={!canEdit || pending} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 shrink-0 border border-border")}>
        Agregar
      </button>
    </form>
  );

  return (
    <div data-bleed="" className="flex flex-col">
      <header className="mx-auto grid w-full max-w-[1240px] gap-1 px-5 pb-2 pt-5">
        <h1 className="text-lg font-medium text-foreground">Configuración</h1>
        <p className="text-xs text-muted-foreground">{canEdit ? "Las etapas de tu pipeline, por qué se pierden las ventas, las etiquetas y los equipos." : "Solo el dueño o un administrador puede cambiarla."}</p>
      </header>
      <div className="mx-auto grid w-full max-w-[1240px] gap-4 px-5 pb-2 pt-2 lg:grid-cols-2">
        <section id="etapas" aria-labelledby="cfg-etapas" className={cn(card, "scroll-mt-20 lg:col-span-2")}>
          <h2 id="cfg-etapas" className="mb-1 text-base font-semibold text-foreground">
            Etapas
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">Al mover una oportunidad a una etapa toma su probabilidad (se puede cambiar después). La etapa ganada va al final con 100 %.</p>
          <ol className="divide-y divide-border/60">
            {data.stages.map((s) => {
              const i = open.findIndex((x) => x.id === s.id);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="w-6 text-center text-xs text-muted-foreground tabular-nums">{s.position + 1}</span>
                  <label className="sr-only" htmlFor={`st-${s.id}`}>
                    Nombre de la etapa {s.position + 1}
                  </label>
                  <input id={`st-${s.id}`} {...blurSave(s.name, (v) => run(() => updateStageAction(slug, s.id, { name: v })))} className={cn(inputClasses, "h-9 min-w-40 flex-1")} />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Probabilidad
                    <input
                      type="number"
                      min={0}
                      max={100}
                      {...blurSave(String(s.probability), (v) => run(() => updateStageAction(slug, s.id, { probability: Number(v) })))}
                      disabled={!canEdit || s.isWon || pending}
                      className={cn(inputClasses, "h-9 w-20 tabular-nums")}
                    />
                    %
                  </label>
                  <span className="w-24 text-xs text-muted-foreground">{s.isWon ? "Etapa ganada" : `${s.open} abiertas`}</span>
                  {!s.isWon ? (
                    <span className="flex">
                      <button type="button" aria-label={`Subir ${s.name}`} disabled={!canEdit || i === 0 || pending} onClick={() => run(() => moveStageOrderAction(slug, s.id, -1))} className={iconBtn}>
                        <ArrowUp aria-hidden="true" className="size-4" />
                      </button>
                      <button type="button" aria-label={`Bajar ${s.name}`} disabled={!canEdit || i === open.length - 1 || pending} onClick={() => run(() => moveStageOrderAction(slug, s.id, 1))} className={iconBtn}>
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar ${s.name}`}
                        disabled={!canEdit || pending}
                        onClick={async () => (await confirm({ title: `¿Eliminar la etapa «${s.name}»?`, confirmLabel: "Eliminar", tone: "danger" })) && run(() => deleteStageAction(slug, s.id))}
                        className={iconBtn}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </span>
                  ) : (
                    <span className="w-24" />
                  )}
                </li>
              );
            })}
          </ol>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              run(() => createStageAction(slug, String(f.get("etapa") ?? ""), Number(f.get("prob") ?? 0)));
              e.currentTarget.reset();
            }}
          >
            <label className="sr-only" htmlFor="new-stage">
              Nueva etapa
            </label>
            <input id="new-stage" name="etapa" placeholder="Nueva etapa, p. ej. Negociación" disabled={!canEdit} className={cn(inputClasses, "h-9 min-w-48 flex-1")} />
            <label className="sr-only" htmlFor="new-stage-prob">
              Probabilidad de la nueva etapa
            </label>
            <input id="new-stage-prob" name="prob" type="number" min={0} max={100} defaultValue={50} disabled={!canEdit} className={cn(inputClasses, "h-9 w-20")} />
            <button type="submit" disabled={!canEdit || pending} className={buttonVariants({ variant: "accent", size: "sm", className: "h-9 font-semibold" })}>
              + Etapa
            </button>
          </form>
        </section>

        <section aria-labelledby="cfg-motivos" className={card}>
          <h2 id="cfg-motivos" className="mb-4 text-base font-semibold text-foreground">
            Motivos de pérdida
          </h2>
          <ul className="divide-y divide-border/60">
            {data.reasons.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-2">
                <label className="sr-only" htmlFor={`rs-${r.id}`}>
                  Motivo
                </label>
                <input id={`rs-${r.id}`} {...blurSave(r.name, (v) => run(() => renameReasonAction(slug, r.id, v)))} className={cn(inputClasses, "h-9")} />
                <button type="button" aria-label={`Eliminar motivo ${r.name}`} disabled={!canEdit || pending} onClick={() => run(() => deleteReasonAction(slug, r.id))} className={iconBtn}>
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          {addRow("Nuevo motivo", "Nuevo motivo", (v) => run(() => addReasonAction(slug, v)))}
        </section>

        <section aria-labelledby="cfg-etiquetas" className={card}>
          <h2 id="cfg-etiquetas" className="mb-4 text-base font-semibold text-foreground">
            Etiquetas
          </h2>
          <ul className="flex flex-wrap gap-2">
            {data.tags.map((t) => (
              <li key={t.id} className="inline-flex items-center gap-1 rounded-full border border-border-strong py-[3px] pe-1.5 ps-2.5 text-xs text-foreground">
                {t.name}
                <button type="button" aria-label={`Quitar etiqueta ${t.name}`} disabled={!canEdit || pending} onClick={() => run(() => deleteTagAction(slug, t.id))} className="grid size-5 place-items-center rounded-full text-muted-foreground hover:text-foreground">
                  <X aria-hidden="true" className="size-3" />
                </button>
              </li>
            ))}
            {data.tags.length === 0 ? <li className="text-sm text-muted-foreground">Aún no hay etiquetas. También se crean al etiquetar una oportunidad.</li> : null}
          </ul>
          {addRow("Nueva etiqueta", "Nueva etiqueta, p. ej. Mayorista", (v) => run(() => addTagAction(slug, v)))}
        </section>

        <section aria-labelledby="cfg-equipos" className={card}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="cfg-equipos" className="text-base font-semibold text-foreground">
              Equipos
            </h2>
            <button type="button" disabled={!canEdit} onClick={() => setTeam({ id: null, name: "", memberIds: [] })} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border")}>
              Nuevo equipo
            </button>
          </div>
          <ul className="divide-y divide-border/60">
            {data.teams.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-sm text-foreground">{t.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{t.memberIds.map((m) => data.people.find((p) => p.id === m)?.name).filter(Boolean).join(", ") || "Sin integrantes"}</span>
                </span>
                <button type="button" disabled={!canEdit} onClick={() => setTeam(t)} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8")}>
                  Editar
                </button>
                <button type="button" aria-label={`Eliminar equipo ${t.name}`} disabled={!canEdit || pending} onClick={async () => (await confirm({ title: `¿Eliminar el equipo «${t.name}»?`, confirmLabel: "Eliminar", tone: "danger" })) && run(() => deleteTeamAction(slug, t.id))} className={iconBtn}>
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
            {data.teams.length === 0 ? <li className="py-2 text-sm text-muted-foreground">Sin equipos. Úsalos si varias personas venden y quieres agruparlas.</li> : null}
          </ul>
        </section>

        <section aria-labelledby="cfg-mas" className={card}>
          <h2 id="cfg-mas" className="mb-4 text-base font-semibold text-foreground">
            Otras herramientas del CRM
          </h2>
          <ul className="grid gap-2 text-sm">
            {[
              { href: `/${slug}/crm/tareas`, icon: CheckSquare, label: "Tareas", hint: "Las actividades del pipeline también aparecen aquí" },
              { href: `/${slug}/proyectos/entregables`, icon: FileCheck2, label: "Entregables", hint: "Lo que entregas a cada cliente" },
              { href: `/${slug}/crm/formularios`, icon: Link2, label: "Formularios web", hint: "Captan oportunidades desde tu sitio" },
            ].map(({ href, icon: Icon, label, hint }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 rounded-lg p-2 outline-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring">
                  <span aria-hidden="true" className="grid size-[30px] place-items-center rounded-lg bg-surface-muted text-accent-text">
                    <Icon className="size-4" />
                  </span>
                  <span className="grid">
                    <span className="text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <FormDialog
        open={team !== null}
        onOpenChange={(v) => !v && setTeam(null)}
        title={team?.id ? "Editar equipo" : "Nuevo equipo"}
        onSubmit={async (fd) => {
          const r = await saveTeamAction(slug, team?.id ?? null, String(fd.get("nombre") ?? ""), fd.getAll("miembros").map(String));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={(r) => {
          toast(r.message ?? "Equipo guardado", "success");
          setTeam(null);
          router.refresh();
        }}
      >
        <Field label="Nombre" required>
          {(c) => <input {...c} name="nombre" defaultValue={team?.name ?? ""} className={inputClasses} />}
        </Field>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">Integrantes</legend>
          {data.people.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="miembros" value={p.id} defaultChecked={team?.memberIds.includes(p.id)} className="size-4 accent-[var(--accent)]" />
              {p.name}
            </label>
          ))}
        </fieldset>
      </FormDialog>
      {confirmDialog}
    </div>
  );
}
