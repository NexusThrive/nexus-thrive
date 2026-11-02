"use client";

import Link from "next/link";
import { ArrowRight, Check, HandCoins, Package, Receipt, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/molecules/popover";
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

const SIZE = 40;
const CENTER = SIZE / 2;
const RADIUS = 17;
/** Hueco entre tramos, en grados. */
const GAP = 14;

function polar(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return `${(CENTER + RADIUS * Math.cos(rad)).toFixed(2)} ${(CENTER + RADIUS * Math.sin(rad)).toFixed(2)}`;
}

/** Un tramo del anillo por paso: arco entre dos ángulos (con hueco). */
function arc(index: number, total: number) {
  const span = 360 / total;
  const gap = total === 1 ? 0 : GAP;
  const start = index * span + gap / 2;
  const end = (index + 1) * span - gap / 2;
  return `M ${polar(start)} A ${RADIUS} ${RADIUS} 0 ${end - start > 180 ? 1 : 0} 1 ${polar(end)}`;
}

/**
 * Primeros pasos de una cuenta nueva, en la barra superior: un círculo con «!» y un anillo de un tramo por paso (relleno
 * en oro el que ya está hecho, de rayas el que falta). Al pulsarlo se abre la lista en orden: el siguiente paso
 * pendiente, con qué hacer y un botón que lleva directo, y los demás debajo. Lo marca como hecho el servidor según los
 * datos reales del negocio. Con todos los pasos hechos no se muestra.
 */
export function FirstStepsIndicator({ steps }: { steps: WelcomeStep[] }) {
  if (steps.length < 2 || steps.every((s) => s.done)) return null;
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tour="first-steps"
          aria-label={`Primeros pasos: ${doneCount} de ${steps.length} completados. Ver la lista`}
          className="relative grid size-10 shrink-0 place-items-center rounded-full text-accent-text outline-none transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:size-11"
        >
          <svg aria-hidden="true" viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 size-full">
            {steps.map((step, i) => (
              <path
                key={step.id}
                d={arc(i, steps.length)}
                fill="none"
                strokeWidth={step.done ? 3 : 2}
                strokeLinecap={step.done ? "round" : "butt"}
                strokeDasharray={step.done ? undefined : "2.4 3"}
                className={step.done ? "stroke-accent" : "stroke-border-strong"}
              />
            ))}
          </svg>
          <span aria-hidden="true" className="relative font-display text-base font-extrabold leading-none">!</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(360px,calc(100vw-24px))] p-0">
        <div className="border-b border-border px-4 py-3.5">
          <h2 className="font-display text-sm font-semibold text-foreground">Primeros pasos</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {doneCount} de {steps.length} {steps.length === 1 ? "paso completado" : "pasos completados"}. Estos pasos dejan tu negocio al día desde el inicio.
          </p>
        </div>
        <ol className="grid gap-0.5 p-2">
          {steps.map((step, index) => {
            const isNext = step.id === next?.id;
            const Icon = ICONS[step.icon];
            return (
              <li key={step.id} className={cn("rounded-md", isNext && "bg-surface-muted")}>
                <div className="flex items-start gap-3 px-2.5 py-2.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                      step.done ? "border-transparent bg-accent text-ink" : isNext ? "border-accent text-accent-text" : "border-dashed border-border-strong text-muted-foreground",
                    )}
                  >
                    {step.done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("flex items-center gap-2 text-sm font-medium", step.done ? "text-muted-foreground line-through decoration-1" : "text-foreground")}>
                      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
                      {step.title}
                      {step.done ? <span className="sr-only">(completado)</span> : null}
                    </p>
                    {isNext ? (
                      <>
                        <p className="mt-1 text-ui leading-relaxed text-muted-foreground">{step.description}</p>
                        <Link href={step.href} className={cn(buttonVariants({ variant: "accent", size: "sm" }), "mt-2.5")} data-press="">
                          {step.cta}
                          <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                      </>
                    ) : !step.done ? (
                      <Link href={step.href} className="mt-0.5 inline-flex rounded-sm text-xs font-semibold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        {step.cta}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </PopoverContent>
    </Popover>
  );
}
