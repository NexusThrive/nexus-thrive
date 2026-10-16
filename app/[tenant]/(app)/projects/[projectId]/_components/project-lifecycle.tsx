"use client";

import { useEffect, useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Pencil } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import {
  nextProjectStatuses,
  projectStatusLabel,
  projectStatusNeedsBaselineWarning,
  isTerminalProjectStatus,
  type ProjectStatusValue,
} from "@/lib/projects";
import {
  updateProjectAction,
  updateProjectStatusAction,
  type UpdateProjectFormState,
} from "../../actions";

const IDLE_STATE: UpdateProjectFormState = { status: "idle" };

/**
 * Ciclo de vida del proyecto (ajuste C): edita nombre/descripción (OWNER y
 * STAFF) y aplica transiciones de estado con compare-and-set (solo OWNER).
 * Pasar a Aprobado o En ejecución sin línea base aprobada avisa, no bloquea.
 */
export default function ProjectLifecycle({
  tenantSlug,
  projectId,
  name,
  description,
  status,
  canChangeStatus,
  hasApprovedBaseline,
}: {
  tenantSlug: string;
  projectId: string;
  name: string;
  description: string;
  status: ProjectStatusValue;
  canChangeStatus: boolean;
  hasApprovedBaseline: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateProjectAction,
    IDLE_STATE,
  );
  const [isTransitioning, startTransition] = useTransition();

  // Cerrar el editor al guardar con éxito se ajusta durante el render (no en
  // un efecto) para no encadenar renders; el refresh sí es un efecto externo.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "ok") {
      setEditing(false);
    }
  }

  useEffect(() => {
    if (state.status === "ok") {
      router.refresh();
    }
  }, [state, router]);

  const nextStates = nextProjectStatuses(status);

  const onTransition = (target: ProjectStatusValue) => {
    if (
      projectStatusNeedsBaselineWarning(target) &&
      !hasApprovedBaseline &&
      !window.confirm(
        `Este proyecto no tiene una línea base de presupuesto aprobada.\n\n¿Pasar igualmente a “${projectStatusLabel(target)}”?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await updateProjectStatusAction(
        tenantSlug,
        projectId,
        status,
        target,
      );
      if (!result.ok) {
        window.alert(result.message ?? "No se pudo cambiar el estado.");
        return;
      }
      if (result.warning) {
        window.alert(result.warning);
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canChangeStatus ? (
          nextStates.length > 0 ? (
            nextStates.map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => onTransition(target)}
                disabled={isTransitioning}
                className={[
                  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition disabled:opacity-50",
                  target === "CANCELLED"
                    ? "border-rose-400/40 text-rose-400 hover:bg-rose-400/10"
                    : "border-border bg-card text-foreground/80 hover:bg-muted",
                ].join(" ")}
              >
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                {projectStatusLabel(target)}
              </button>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">
              Estado final: no admite más transiciones.
            </span>
          )
        ) : null}
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
        >
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          {editing ? "Cerrar" : "Editar nombre y descripción"}
        </button>
        {isTransitioning ? (
          <NLoader size={14} className="text-muted-foreground" />
        ) : null}
      </div>

      {editing ? (
        <form
          action={formAction}
          className="space-y-3 rounded-lg border border-border bg-card p-4"
          noValidate
        >
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="projectId" value={projectId} />

          <div>
            <label
              htmlFor="project-name"
              className="text-sm font-medium text-foreground/80"
            >
              Nombre <span className="text-destructive">*</span>
            </label>
            <input
              id="project-name"
              name="name"
              defaultValue={state.values?.name ?? name}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-foreground/20 focus:border-gold-500 focus:outline-2 focus:outline-gold-600/30"
            />
            {state.errors?.name ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {state.errors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="project-description"
              className="text-sm font-medium text-foreground/80"
            >
              Descripción
            </label>
            <textarea
              id="project-description"
              name="description"
              rows={2}
              defaultValue={state.values?.description ?? description}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-foreground/20 focus:border-gold-500 focus:outline-2 focus:outline-gold-600/30"
            />
            {state.errors?.description ? (
              <p role="alert" className="mt-1 text-xs text-destructive">
                {state.errors.description}
              </p>
            ) : null}
          </div>

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setEditing(false)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <NLoader size={16} className="text-current" />
              ) : (
                <Check aria-hidden="true" className="h-4 w-4" />
              )}
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      ) : null}

      {canChangeStatus &&
      !hasApprovedBaseline &&
      !isTerminalProjectStatus(status) ? (
        <p className="text-xs text-muted-foreground">
          Sin línea base de presupuesto aprobada: pasar a “Aprobado” o “En
          ejecución” se puede, pero quedará sin cifras congeladas.
        </p>
      ) : null}
    </div>
  );
}
