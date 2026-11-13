"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, MessageCircle, Paperclip, Search, X } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { useToast } from "@/components/molecules/toast";
import NoteDialog from "../note-dialog";
import { attachCustomerFileAction } from "@/app/[tenant]/(app)/contactos/[id]/ficha-actions";
import { cn } from "@/lib/utils";

/** Evento de la actividad ya preparado en el servidor (fecha ISO; `fresh` = de las últimas 24 horas). */
export type ActivityItem = { id: string; date: string; text: string; author: string | null; fresh: boolean };

const outline = cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 rounded-full border border-border/60 bg-transparent px-4");
const iconButton = "grid size-9 place-items-center rounded-full bg-surface-muted text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring";
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
  customerName,
  bare = false,
}: {
  /** Sin fondo de tarjeta: la línea de tiempo en la columna derecha de la ficha. */
  bare?: boolean;
  slug: string;
  customerId: string;
  items: ActivityItem[];
  whatsappHref: string | null;
  /** Programar una actividad (tarea del CRM con el cliente); `null` si el módulo no está activo. */
  activityHref: string | null;
  /** Instante del servidor (ISO) para «Hoy» y «Ayer» sin desajuste de hidratación. */
  now: string;
  /** Para el modal de «Nueva nota». */
  customerName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [noting, setNoting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

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
    <section aria-labelledby="ficha-actividad" className={bare ? "" : "rounded-(--radius-widget) border border-border/60 bg-card p-6"}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="grid gap-0.5">
          <h2 id="ficha-actividad" className="text-ui font-semibold text-foreground">
            Historial de interacción
          </h2>
          <p className="text-xs text-muted-foreground">Mensajes, notas, pagos y citas</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "accent", size: "sm" }), "h-10 rounded-full px-5 font-semibold")}>
              <MessageCircle aria-hidden="true" className="size-4" />
              Enviar mensaje
            </a>
          ) : null}
          <button type="button" aria-haspopup="dialog" onClick={() => setNoting(true)} className={outline}>
            Registrar nota
          </button>
          {activityHref ? (
            <Link href={activityHref} className={outline}>
              <CheckSquare aria-hidden="true" className="size-4" />
              Nueva tarea
            </Link>
          ) : null}
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

      {groups.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">{term ? "Nada coincide con la búsqueda." : "Aún no hay actividad."}</p>
      ) : (
        // Alto máximo y scroll propio: la columna no se alarga sin fin. Se enfoca con Tab para desplazarla.
        <div role="region" aria-label="Historial de actividad" tabIndex={0} className="-me-2 mt-4 grid max-h-[min(60vh,560px)] gap-5 overflow-y-auto overscroll-contain pe-2 outline-none focus-visible:outline-2 focus-visible:outline-ring">
          {groups.map((group) => (
            <div key={group.label} className="grid gap-3">
              <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
              {/* Fichas como en la referencia, todas en gris suave; la reciente lleva un punto de oro junto a su hora. */}
              <ol className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
                {group.items.map((item) => (
                  <li key={item.id} className={cn("grid content-start gap-2 rounded-2xl p-4", "bg-surface-muted/60 text-foreground")}>
                    <p className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                      {item.fresh ? <span aria-hidden="true" className="size-2 rounded-full bg-accent" /> : null}
                      {time.format(new Date(item.date))}
                    </p>
                    <p className="line-clamp-3 text-ui font-medium leading-snug">{item.text}</p>
                    {item.author ? <p className="truncate text-xs text-muted-foreground">{item.author}</p> : null}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
      <NoteDialog open={noting} onOpenChange={setNoting} tenantSlug={slug} customerId={customerId} customerName={customerName} />
    </section>
  );
}
