"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Copy, HelpCircle, Mail, MessageCircle, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { CAPABILITIES } from "@/lib/core/capabilities/registry";
import { greetingFor } from "@/lib/experience/dashboard/index";
import { whatsappLink } from "@/lib/foundation/contact";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "soporte@nexusthrive.com.co";

type Tab = "search" | "contact";

const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Centro de ayuda: el «?» fijo en la esquina abre un panel que flota despegado de los bordes. Dos pestañas:
 * «Buscar» (preguntas sobre NEXUS: busca en el catálogo de funciones y lleva a la sección, o a Funciones si el negocio
 * aún no la usa) y «Contacto» (correo, WhatsApp, mejorar el plan y el ID de soporte del negocio).
 * El asistente con IA no existe todavía: la búsqueda es sobre el catálogo real, sin inventar respuestas.
 */
export function HelpCenter({
  tenantSlug,
  businessName,
  activeModules,
}: {
  tenantSlug: string;
  businessName: string;
  activeModules: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const base = `/${tenantSlug}`;

  const results = useMemo(() => {
    const text = normalize(query.trim());
    if (text.length < 2) return [];
    return CAPABILITIES.filter((c) => c.status !== "PLANNED" && c.id !== "dashboard")
      .filter((c) => normalize(`${c.name} ${c.label} ${c.description} ${c.pitch} ${c.category}`).includes(text))
      .slice(0, 8);
  }, [query]);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(tenantSlug);
      toast("ID de soporte copiado", "success");
    } catch {
      toast("No se pudo copiar. Selecciónalo y cópialo a mano.", "error");
    }
  }

  const whatsapp = whatsappLink(`Hola, necesito ayuda con NEXUS THRIVE. Mi negocio: ${businessName} (ID de soporte: ${tenantSlug}).`);

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={setOpen}
      drawer
      floating
      unsavedGuard={false}
      title="Centro de ayuda"
      trigger={
        <button
          type="button"
          data-tour="help"
          aria-label="Centro de ayuda"
          data-press=""
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-(--z-sticky) grid size-12 place-items-center rounded-full border border-border bg-surface text-foreground shadow-(--shadow-popover) transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:size-14 md:bottom-6 md:right-6"
        >
          <HelpCircle aria-hidden="true" className="size-6" strokeWidth={1.8} />
        </button>
      }
    >
      <div role="tablist" aria-label="Secciones del centro de ayuda" className="mb-4 flex gap-1 border-b border-border">
        {(
          [
            ["search", "Buscar"],
            ["contact", "Contacto"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            type="button"
            id={`help-tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`help-panel-${value}`}
            onClick={() => setTab(value)}
            className={cn(
              "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
              tab === value ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "search" ? (
        <div role="tabpanel" id="help-panel-search" aria-labelledby="help-tab-search" className="grid gap-5">
          <div>
            <p className="font-display text-xl font-bold leading-tight">{greetingFor()}.</p>
            <p className="font-display text-xl font-bold leading-tight text-muted-foreground">¿Qué quieres saber de NEXUS?</p>
          </div>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Buscar en el centro de ayuda"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar una función o una pregunta"
              className="pl-9"
              autoComplete="off"
            />
          </div>
          {query.trim().length >= 2 ? (
            results.length > 0 ? (
              <ul className="grid gap-1.5">
                {results.map((c) => {
                  const on = activeModules.includes(c.id);
                  const href = on ? `${base}${c.nav[0]?.href ?? "/functions"}` : `${base}/functions`;
                  return (
                    <li key={c.id}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className="group flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-muted">
                          <c.icon aria-hidden="true" className="size-4" strokeWidth={1.6} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{c.name}</span>
                          <span className="block text-ui text-muted-foreground">{c.description}</span>
                          <span className="mt-1 block text-xs font-medium text-accent-text">{on ? "Abrir la sección" : "Todavía apagada: actívala en Funciones"}</span>
                        </span>
                        <ArrowUpRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={<Search aria-hidden="true" className="size-6" />}
                title="No encontramos eso"
                description="Prueba con otra palabra o escríbele a nuestro equipo desde la pestaña Contacto."
              />
            )
          ) : (
            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Para empezar</p>
              <ShortcutLink href={`${base}/functions`} icon={<Sparkles aria-hidden="true" className="size-4" />} onNavigate={() => setOpen(false)} title="Funciones de NEXUS" hint="Mira todo lo que puedes encender en tu negocio." />
              <ShortcutLink href={`${base}/settings`} icon={<ArrowUpRight aria-hidden="true" className="size-4" />} onNavigate={() => setOpen(false)} title="Ajustes del negocio" hint="Perfil, equipo, plan y datos de tu cuenta." />
            </div>
          )}
        </div>
      ) : (
        <div role="tabpanel" id="help-panel-contact" aria-labelledby="help-tab-contact" className="grid gap-5">
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Opciones de contacto</p>
            <ContactRow href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Ayuda con NEXUS · ${businessName}`)}`} icon={<Mail aria-hidden="true" className="size-4" />} title="Enviar correo" hint="Escríbele a nuestro equipo de soporte." />
            <ContactRow href={whatsapp} external icon={<MessageCircle aria-hidden="true" className="size-4" />} title="Chat por WhatsApp" hint="Habla con nuestros agentes por WhatsApp." />
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Exclusivas</p>
            <ShortcutLink href={`${base}/settings`} icon={<Sparkles aria-hidden="true" className="size-4" />} onNavigate={() => setOpen(false)} title="Mejorar mi plan" hint="Mira qué incluye cada plan y cámbialo cuando quieras." />
          </div>
          <div className="rounded-lg border border-border bg-surface-muted p-3.5">
            <p className="text-sm font-semibold">ID de soporte</p>
            <p className="mt-0.5 text-ui text-muted-foreground">Úsalo para identificarte con nuestro equipo.</p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <code className="min-w-0 truncate rounded-sm bg-surface px-2 py-1 font-mono text-ui">{tenantSlug}</code>
              <button
                type="button"
                onClick={copyId}
                aria-label="Copiar el ID de soporte"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-semibold transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-11"
              >
                <Copy aria-hidden="true" className="size-3.5" /> Copiar
              </button>
            </div>
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
}

function RowShell({ icon, title, hint, trailing }: { icon: ReactNode; title: string; hint: string; trailing?: ReactNode }) {
  return (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-ui text-muted-foreground">{hint}</span>
      </span>
      {trailing ?? <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
    </>
  );
}

const rowClass = "flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function ShortcutLink({ href, icon, title, hint, onNavigate }: { href: string; icon: ReactNode; title: string; hint: string; onNavigate: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} className={rowClass}>
      <RowShell icon={icon} title={title} hint={hint} />
    </Link>
  );
}

function ContactRow({ href, icon, title, hint, external = false }: { href: string; icon: ReactNode; title: string; hint: string; external?: boolean }) {
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} className={rowClass}>
      <RowShell icon={icon} title={title} hint={hint} trailing={<>{external ? <span className="sr-only">(se abre en otra pestaña)</span> : null}<ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /></>} />
    </a>
  );
}

