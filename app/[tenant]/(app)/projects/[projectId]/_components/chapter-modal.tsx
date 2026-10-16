"use client";

import { useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { NLoader } from "@/components/atoms/n-loader";
import Modal from "@/components/organisms/modal";
import {
  createChapterAction,
  updateChapterAction,
  type ChapterFormState,
} from "../budget/actions";

const IDLE_STATE: ChapterFormState = { status: "idle" };

const FIELD_CLASS = (hasError: boolean) =>
  [
    "mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm text-foreground transition placeholder:text-muted-foreground focus:outline-2",
    hasError
      ? "border-destructive/30 focus:border-destructive focus:outline-destructive/30"
      : "border-border hover:border-foreground/20 focus:border-gold-500 focus:outline-gold-600/30",
  ].join(" ");

/** Valores serializables de un capítulo para el modo edición. */
export type EditableChapter = {
  id: string;
  name: string;
  description: string;
};

/** Modal para crear o editar un capítulo del presupuesto. */
export default function ChapterModal({
  open,
  onClose,
  tenantSlug,
  projectId,
  expectedRevision,
  chapter,
}: {
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
  projectId: string;
  expectedRevision: number;
  chapter?: EditableChapter;
}) {
  const isEditing = Boolean(chapter);
  const [state, formAction, isPending] = useActionState(
    isEditing ? updateChapterAction : createChapterAction,
    IDLE_STATE,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status === "ok") {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const errors = state.errors ?? {};
  const defaults = {
    name: state.values?.name ?? chapter?.name ?? "",
    description: state.values?.description ?? chapter?.description ?? "",
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
      title={isEditing ? "Editar capítulo" : "Nuevo capítulo"}
    >
      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="projectId" value={projectId} />
        <input
          type="hidden"
          name="expectedRevision"
          value={String(expectedRevision)}
        />
        {chapter ? (
          <input type="hidden" name="chapterId" value={chapter.id} />
        ) : null}

        <div>
          <label
            htmlFor="chapter-name"
            className="text-sm font-medium text-foreground/80"
          >
            Nombre del capítulo <span className="text-destructive">*</span>
          </label>
          <input
            id="chapter-name"
            name="name"
            defaultValue={defaults.name}
            placeholder="Ej. Preliminares"
            aria-invalid={Boolean(errors.name)}
            className={FIELD_CLASS(Boolean(errors.name))}
          />
          {errors.name ? (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="chapter-description"
            className="text-sm font-medium text-foreground/80"
          >
            Descripción
          </label>
          <textarea
            id="chapter-description"
            name="description"
            rows={2}
            defaultValue={defaults.description}
            placeholder="Notas del capítulo (opcional)."
            aria-invalid={Boolean(errors.description)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground hover:border-foreground/20 focus:border-gold-500 focus:outline-2 focus:outline-gold-600/30"
          />
          {errors.description ? (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {errors.description}
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

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <NLoader size={16} className="text-current" />
            ) : null}
            {isPending
              ? isEditing
                ? "Guardando…"
                : "Creando…"
              : isEditing
                ? "Guardar cambios"
                : "Crear capítulo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
