"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Paperclip, Search, X } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { useToast } from "@/components/molecules/toast";
import { createCustomerNoteAction, type NoteFormState } from "@/app/[tenant]/(app)/contactos/[id]/actions";
import { attachCustomerFileAction } from "@/app/[tenant]/(app)/contactos/[id]/ficha-actions";
import { cn } from "@/lib/utils";

/** Evento de la actividad ya preparado en el servidor (fecha ISO; `fresh` = de las últimas 24 horas). */
export type ActivityItem = { id: string; date: string; text: string; author: string | null; fresh: boolean };

const outline = cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border bg-transparent");
const iconButton = "grid size-8 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
const day = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });
const time = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });

/** «Hoy · 7 nov 2026», «Ayer · 6 nov 2026» o la fecha sola. */
function dayLabel(iso: string, today: string, yesterday: string) {
  const d = new Date(iso);
  const key = dayKey.format(d);
  const label = day.format(d).replace(".", "").replace(/ de /g, " ");
  return key === today ? `Hoy · ${label}` : key === yesterday ? `Ayer · ${label}` : label;
}

/**
 * Columna de actividad de la ficha: enviar mensaje (WhatsApp), registrar nota, programar una actividad, buscar y adjuntar, y la línea de
 * tiempo agrupada por día.
 */
export default function FichaActivity({
  slug,
  customerId,
  items,
  whatsappHref,
  activityHref,
  now,
}: {
  slug: string;
  customerId: string;
  items: ActivityItem[];
  whatsappHref: string | null;
  /** Programar una actividad (tarea del CRM con el cliente); `null` si el módulo no está activo. */
  activityHref: string | null;
  /** Instante del servidor (ISO) para «Hoy» y «Ayer» sin desajuste de hidratación. */
  now: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [noting, setNoting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction, saving] = useActionState<NoteFormState, FormData>(async (prev, fd) => {
    const r = await createCustomerNoteAction(prev, fd);
    if (r.status === "ok") {
      toast("Nota registrada", "success");
      setNoting(false);
      router.refresh();
    }
    return r;
  }, { status: "idle" });

  const today = dayKey.format(new Date(now));
  const yesterday = dayKey.format(new Date(new Date(now).getTime() - 86_400_000));
  const term = q.trim().toLocaleLowerCase("es");
  const shown = term ? items.filter((i) => i.text.toLocaleLowerCase("es").includes(term)) : items;
  const groups: { label: string; items: ActivityItem[] }[] = [];
  for (const item of shown) {
    const label = dayLabel(item.date, today, yesterday);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  const upload = (file: File) =>
    startUpload(async () => {
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("customerId", customerId);
      fd.set("file", file);
      const r = await attachCustomerFileAction(fd);
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok) router.refresh();
    });

  return (
    <section aria-labelledby="ficha-actividad" className="rounded-xl border border-border bg-card p-[22px]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="ficha-actividad" className="text-base font-semibold text-foreground">
          Actividad
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Buscar en la actividad" aria-pressed={searching} onClick={() => setSearching((s) => !s)} className={iconButton}>
            <Search aria-hidden="true" className="size-4" />
          </button>
          <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }} />
          <button type="button" aria-label="Adjuntar un archivo" disabled={uploading} onClick={() => fileRef.current?.click()} className={iconButton}>
            <Paperclip aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      {searching ? (
        <div className="relative mb-4">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en la actividad" placeholder="Buscar en la actividad" className={cn(inputClasses, "pe-9")} />
          {q ? (
            <button type="button" aria-label="Limpiar la búsqueda" onClick={() => setQ("")} className="absolute inset-y-0 end-1 my-auto grid size-8 place-items-center text-muted-foreground hover:text-foreground">
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {whatsappHref ? (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px] font-semibold" })}>
            <MessageCircle aria-hidden="true" className="size-4" />
            Enviar mensaje
          </a>
        ) : null}
        <button type="button" aria-expanded={noting} onClick={() => {
          setNoting((n) => !n);
          requestAnimationFrame(() => noteRef.current?.focus());
        }} className={outline}>
          Registrar nota
        </button>
        {activityHref ? (
          <Link href={activityHref} className={outline}>
            Actividad
          </Link>
        ) : null}
      </div>

      {noting ? (
        <form action={formAction} className="mt-4 grid gap-2">
          <input type="hidden" name="tenantSlug" value={slug} />
          <input type="hidden" name="customerId" value={customerId} />
          <label htmlFor="ficha-nota" className="text-xs font-medium text-muted-foreground">
            Nota interna
          </label>
          <textarea ref={noteRef} id="ficha-nota" name="content" rows={3} maxLength={2000} required defaultValue={state.status === "error" ? state.content : ""} aria-invalid={state.status === "error" || undefined} aria-describedby={state.status === "error" ? "ficha-nota-error" : undefined} className={textareaClasses} />
          {state.status === "error" ? (
            <p id="ficha-nota-error" role="alert" className="text-xs text-danger">
              {state.message}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px] font-semibold" })}>
              {saving ? "Guardando…" : "Guardar nota"}
            </button>
            <button type="button" onClick={() => setNoting(false)} className={outline}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {groups.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">{term ? "Nada coincide con la búsqueda." : "Aún no hay actividad."}</p>
      ) : (
        // Alto máximo y scroll propio: la columna no se alarga sin fin. Se enfoca con Tab para desplazarla.
        <div role="region" aria-label="Historial de actividad" tabIndex={0} className="-me-2 mt-2 max-h-[min(60vh,560px)] overflow-y-auto overscroll-contain pe-2 outline-none focus-visible:outline-2 focus-visible:outline-ring">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                {group.label}
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </p>
              <ol className="grid gap-4">
                {group.items.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.fresh ? "bg-accent" : "bg-muted-foreground/60")} />
                    <div className="min-w-0">
                      <p className="text-ui text-foreground">{item.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.author ? `${item.author} · ` : ""}
                        {time.format(new Date(item.date))}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
