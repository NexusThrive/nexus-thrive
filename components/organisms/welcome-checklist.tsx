"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, HandCoins, Package, Receipt, UserPlus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProgressBar } from "@/components/atoms/progress-bar";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Button } from "@/components/atoms/button";
import { cn } from "@/lib/utils";

export type WelcomeIcon = "customer" | "payment" | "expense" | "catalog";
const ICONS: Record<WelcomeIcon, LucideIcon> = { customer: UserPlus, payment: HandCoins, expense: Receipt, catalog: Package };

export type WelcomeStep = {
  id: string;
  title: string;
  description: string;
  /** Texto del botón de la acción. */
  cta: string;
  /** Ruta completa (con el slug del negocio). */
  href: string;
  done: boolean;
  icon: WelcomeIcon;
};

const storageKey = (scope: string) => `nx:welcome:${scope}`;

/**
 * Primeros pasos de una cuenta nueva: la lista de lo que conviene hacer al
 * empezar, con el avance («1 de 4») y, del paso elegido, qué hacer y un botón
 * que lleva directo. Lo marca como hecho el servidor según los datos reales
 * del negocio (no lo tilda la persona). «Ocultar» lo guarda en este navegador
 * por negocio. Se pinta tras montar para no parpadear en quien ya lo ocultó.
 */
export function WelcomeChecklist({
  scope,
  name,
  steps,
}: {
  /** Identifica la preferencia guardada (slug del negocio). */
  scope: string;
  name: string;
  steps: WelcomeStep[];
}) {
  const [hidden, setHidden] = useState<boolean | null>(null);
  const firstPending = steps.find((s) => !s.done) ?? steps[0];
  const [selectedId, setSelectedId] = useState(firstPending?.id);

  useEffect(() => {
    let value = false;
    try {
      value = window.localStorage.getItem(storageKey(scope)) === "1";
    } catch {
      /* sin almacenamiento: se muestra */
    }
    // Lee la preferencia tras montar: el servidor no la conoce.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(value);
  }, [scope]);

  if (hidden !== false || steps.length === 0) return null;

  const selected = steps.find((s) => s.id === selectedId) ?? firstPending;
  const doneCount = steps.filter((s) => s.done).length;
  const Icon = ICONS[selected.icon];

  function hide() {
    setHidden(true);
    try {
      window.localStorage.setItem(storageKey(scope), "1");
    } catch {
      /* vale para esta sesión */
    }
  }

  return (
    <section aria-labelledby="welcome-title" className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <h2 id="welcome-title" className="font-display text-lg font-semibold">
            Primeros pasos
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {name}, estos pasos dejan tu negocio al día desde el inicio.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={hide} aria-label="Ocultar primeros pasos">
          <X aria-hidden="true" className="size-3.5" />
          Ocultar
        </Button>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="border-t border-border px-2.5 py-2.5 md:border-r">
          <ol className="flex flex-col gap-0.5">
            {steps.map((step, index) => {
              const active = step.id === selected.id;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(step.id)}
                    aria-pressed={active}
                    data-press=""
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm outline-none transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                      active && "bg-surface-muted font-semibold",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-[4px] border text-xs font-semibold transition-colors duration-200",
                        step.done ? "border-transparent bg-accent text-ink" : "border-border-strong text-muted-foreground",
                      )}
                    >
                      {step.done ? <Check className="size-3.5 motion-safe:animate-[nx-swap_.2s_var(--nx-ease-out)]" strokeWidth={2.5} /> : index + 1}
                    </span>
                    <span className={cn("min-w-0 flex-1", step.done && "text-muted-foreground line-through decoration-1")}>{step.title}</span>
                    {step.done ? <span className="sr-only">(completado)</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 px-2.5 pb-1.5">
            <p className="mb-1.5 text-xs text-muted-foreground">
              {doneCount} de {steps.length} {steps.length === 1 ? "paso completado" : "pasos completados"}
            </p>
            <ProgressBar value={doneCount / steps.length} tone="gold" label="Avance de los primeros pasos" />
          </div>
        </div>

        {/* key: al elegir otro paso, el detalle entra de nuevo (200 ms) */}
        <div key={selected.id} className="nx-swap flex flex-col items-start gap-3 border-t border-border p-5">
          <span className="grid size-10 place-items-center rounded-md bg-surface-muted">
            <Icon aria-hidden="true" strokeWidth={1.6} className="size-5" />
          </span>
          <div>
            <h3 className="font-display text-[15px] font-semibold">{selected.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{selected.description}</p>
          </div>
          {selected.done ? (
            <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-text">
              <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> Completado
            </p>
          ) : (
            <Link href={selected.href} className={buttonVariants({ variant: "accent" })} data-press="">
              {selected.cta}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
