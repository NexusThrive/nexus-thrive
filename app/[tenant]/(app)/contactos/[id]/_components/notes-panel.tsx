"use client";

import { useState } from "react";
import { Plus, StickyNote } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { EmptyState } from "@/components/molecules/empty-state";
import type { Customer360Note } from "@/lib/core/tenancy/db";
import { formatDateTime } from "@/lib/foundation/format";
import { cn } from "@/lib/utils";
import NoteDialog from "./note-dialog";

const cta = cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold");

/**
 * Pestaña Notas: cuántas hay, el botón «Nueva nota» (abre el modal) y las notas como tarjetas suaves, de la más nueva a la más vieja. Sin
 * notas, un estado vacío centrado que invita a escribir la primera.
 */
export default function NotesPanel({ tenantSlug, customerId, customerName, initialNotes }: { tenantSlug: string; customerId: string; customerName: string; initialNotes: Customer360Note[] }) {
  const [open, setOpen] = useState(false);
  const dialog = <NoteDialog open={open} onOpenChange={setOpen} tenantSlug={tenantSlug} customerId={customerId} customerName={customerName} />;

  if (initialNotes.length === 0) {
    return (
      <>
        <EmptyState
          remember={false}
          mark="center"
          icon={<StickyNote />}
          title="Aún no hay notas"
          description={`Anota lo que debe recordar tu equipo sobre ${customerName.trim().split(/\s+/)[0]}: gustos, acuerdos o avisos.`}
          action={
            <button type="button" onClick={() => setOpen(true)} className={cta}>
              <Plus aria-hidden="true" className="size-4" />
              Escribir primera nota
            </button>
          }
        />
        {dialog}
      </>
    );
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ui text-muted-foreground">
          {initialNotes.length} {initialNotes.length === 1 ? "nota interna" : "notas internas"}
        </p>
        <button type="button" onClick={() => setOpen(true)} className={cta}>
          <Plus aria-hidden="true" className="size-4" />
          Nueva nota
        </button>
      </div>
      <ul className="grid gap-2.5">
        {initialNotes.map((note) => (
          <li key={note.id} className="grid gap-2 rounded-3xl bg-surface-muted/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2.5 text-ui font-medium text-foreground">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-card text-xs font-semibold text-accent-text">
                  {(note.authorName ?? "Equipo").trim().charAt(0).toUpperCase()}
                </span>
                {note.authorName ?? "Equipo"}
              </p>
              <time className="text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</time>
            </div>
            <p className="whitespace-pre-wrap text-ui leading-relaxed text-foreground/85">{note.content}</p>
          </li>
        ))}
      </ul>
      {dialog}
    </div>
  );
}
