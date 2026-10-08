"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import type { Customer360Note } from "@/lib/tenant-db";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { NOTE_MAX_LENGTH } from "@/lib/customer-notes";
import { createCustomerNoteAction } from "../actions";

const INITIAL_STATE = { status: "idle" as const };

/**
 * Pestaña Notas: formulario vía Server Action (`useActionState`) + lista
 * de notas existentes. El cliente nunca muta de forma directa.
 *
 * El textarea es NO controlado: tras `ok` se resetea por DOM (external
 * system) en un efecto, sin setState síncrono (evita cascadas de render).
 */
export default function NotesPanel({
  tenantSlug,
  customerId,
  initialNotes,
}: {
  tenantSlug: string;
  customerId: string;
  initialNotes: Customer360Note[];
}) {
  const [state, formAction, isPending] = useActionState(
    createCustomerNoteAction,
    INITIAL_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Al confirmar el guardado, limpia el textarea y devuelve el foco.
  useEffect(() => {
    if (state.status === "ok") {
      formRef.current?.reset();
      textareaRef.current?.focus();
    }
  }, [state.status]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form ref={formRef} action={formAction} className="space-y-3 lg:col-span-1">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="customerId" value={customerId} />

        <label
          htmlFor="note-content"
          className="block text-sm font-medium text-slate-700"
        >
          Nueva nota
        </label>
        <textarea
          ref={textareaRef}
          id="note-content"
          name="content"
          rows={4}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Observación interna sobre este cliente…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <div className="flex items-center justify-between gap-3">
          <p
            className={cn(
              "text-xs",
              state.status === "error" ? "text-rose-600" : "text-slate-400",
            )}
            aria-live="polite"
          >
            {isPending
              ? "Guardando…"
              : state.status === "ok"
                ? state.message
                : state.status === "error"
                  ? state.message
                  : `Máximo ${NOTE_MAX_LENGTH} caracteres`}
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            Guardar nota
          </button>
        </div>
      </form>

      <div className="space-y-3 lg:col-span-2">
        {initialNotes.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Todavía no hay notas sobre este cliente.
          </div>
        ) : (
          initialNotes.map((note) => (
            <article
              key={note.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-900">
                  {note.authorName ?? "Equipo"}
                </p>
                <time className="text-xs text-slate-400">
                  {formatDateTime(note.createdAt)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {note.content}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}