"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Search, Send } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { inputClasses } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type WhatsAppContact = { id: string; name: string; phone: string };

type Sent = { text: string; at: string };

const TEMPLATES: { label: string; text: (first: string, business: string) => string }[] = [
  { label: "Recordatorio de pago", text: (f, b) => `Hola ${f}, te escribimos de ${b}: te recordamos que tu pago de este mes está pendiente. Puedes pagar por Nequi o transferencia.` },
  { label: "Confirmar cita", text: (f, b) => `Hola ${f}, ¿nos confirmas tu cita en ${b}? Responde SÍ para confirmar.` },
  { label: "Gracias por tu visita", text: (f, b) => `Gracias por tu visita, ${f}. En ${b} te esperamos pronto.` },
];

const time = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
const waLink = (phone: string, text: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length === 10 ? `57${d}` : d}?text=${encodeURIComponent(text)}`;
};

const EVENT = "nx:wa-sent";
function readLog(key: string): Record<string, Sent[]> {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, Sent[]>;
  } catch {
    return {};
  }
}
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/**
 * WhatsApp del negocio (vista del artefacto, sin inventar conversaciones):
 * clientes con teléfono a la izquierda; a la derecha la conversación con las
 * plantillas en chips (rebotan al elegirlas), la vista previa como burbuja y
 * "Enviar", que abre WhatsApp con el mensaje listo. Lo enviado desde aquí se
 * recuerda en este navegador. En el celular: lista y chat por separado.
 */
export function WhatsAppComposer({
  contacts,
  businessName,
  storageKey,
}: {
  contacts: WhatsAppContact[];
  businessName: string;
  storageKey: string;
}) {
  const [query, setQuery] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const raw = useSyncExternalStore(subscribe, () => window.localStorage.getItem(storageKey) ?? "{}", () => "{}");
  const log = useMemo(() => {
    try {
      return JSON.parse(raw) as Record<string, Sent[]>;
    } catch {
      return {};
    }
  }, [raw]);
  const boxRef = useRef<HTMLDivElement>(null);

  const list = contacts.filter((c) => !query || `${c.name} ${c.phone}`.toLowerCase().includes(query.toLowerCase()));
  const current = contacts.find((c) => c.id === currentId) ?? null;
  const sent = current ? (log[current.id] ?? []) : [];
  const first = current?.name.split(" ")[0] ?? "";

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [sent.length, draft, currentId]);

  const send = () => {
    if (!current || !draft.trim()) return;
    window.open(waLink(current.phone, draft.trim()), "_blank", "noopener");
    const next = readLog(storageKey);
    next[current.id] = [...(next[current.id] ?? []), { text: draft.trim(), at: new Date().toISOString() }].slice(-20);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // sin almacenamiento: igual se abrió WhatsApp
    }
    window.dispatchEvent(new Event(EVENT));
    setDraft("");
    requestAnimationFrame(() => spring(boxRef.current?.lastElementChild, "y", 18, 0, { stiffness: 420, damping: 20 }));
  };

  return (
    <div className="grid h-[min(640px,calc(100dvh-210px))] min-h-[440px] grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-[300px_minmax(0,1fr)]">
      <div className={cn("flex min-h-0 flex-col border-border md:border-r", current && "max-md:hidden")}>
        <div className="relative border-b border-border p-2.5">
          <Search aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente" aria-label="Buscar cliente" className={cn(inputClasses, "pl-9")} />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {list.map((c) => {
            const last = (log[c.id] ?? []).at(-1);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={c.id === currentId || undefined}
                  onClick={() => setCurrentId(c.id)}
                  className={cn("flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-surface-muted", c.id === currentId && "bg-surface-muted")}
                >
                  <span className="grid size-[34px] shrink-0 place-items-center rounded-md bg-primary font-display text-xs font-bold text-primary-foreground">{initials(c.name)}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate font-medium">{c.name}</b>
                    <small className="block truncate text-xs text-muted-foreground">{last ? `Tú: ${last.text}` : c.phone}</small>
                  </span>
                </button>
              </li>
            );
          })}
          {list.length === 0 ? <li className="p-6 text-center text-[13px] text-muted-foreground">Ningún cliente coincide.</li> : null}
        </ul>
      </div>

      <div className={cn("flex min-h-0 min-w-0 flex-col", !current && "max-md:hidden")}>
        {current ? (
          <>
            <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-2.5">
              <button type="button" aria-label="Volver" onClick={() => setCurrentId(null)} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "md:hidden")}>
                <ArrowLeft aria-hidden="true" className="size-4" />
              </button>
              <span className="grid size-[34px] place-items-center rounded-md bg-primary font-display text-xs font-bold text-primary-foreground">{initials(current.name)}</span>
              <div className="min-w-0 flex-1">
                <b className="block truncate font-semibold">{current.name}</b>
                <small className="font-mono text-xs text-muted-foreground">{current.phone}</small>
              </div>
              <Badge tone="success">WhatsApp</Badge>
            </div>
            <div ref={boxRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-background p-4" aria-live="polite">
              {sent.length === 0 && !draft ? (
                <p className="m-auto max-w-[36ch] text-center text-[13px] text-muted-foreground">Elige una plantilla o escribe un mensaje para {first}. Se abre WhatsApp con el texto listo.</p>
              ) : null}
              {sent.map((m, i) => (
                <div key={`${m.at}-${i}`} className="max-w-[min(78%,440px)] self-end rounded-md bg-primary px-3 py-2 text-sm leading-snug text-primary-foreground">
                  {m.text}
                  <small className="mt-0.5 block text-right text-[10.5px] opacity-65">Enviado · {time.format(new Date(m.at))}</small>
                </div>
              ))}
              {draft.trim() ? (
                <div className="max-w-[min(78%,440px)] self-end rounded-md border border-dashed border-border-strong bg-surface px-3 py-2 text-sm leading-snug">
                  {draft}
                  <small className="mt-0.5 block text-right text-[10.5px] text-muted-foreground">Vista previa</small>
                </div>
              ) : null}
            </div>
            <div className="grid gap-2 border-t border-border p-2.5">
              <ChipRow role="group" aria-label="Plantillas">
                {TEMPLATES.map((t) => (
                  <Chip key={t.label} onClick={() => setDraft(t.text(first, businessName))}>
                    {t.label}
                  </Chip>
                ))}
              </ChipRow>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe un mensaje" aria-label="Mensaje" className={inputClasses} />
                <button type="submit" aria-label="Enviar por WhatsApp" disabled={!draft.trim()} className={buttonVariants({ size: "icon" })}>
                  <Send aria-hidden="true" className="size-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <EmptyState title="Elige un cliente" description="Escríbele por WhatsApp con una plantilla o un mensaje propio." className="m-auto" />
        )}
      </div>
    </div>
  );
}
