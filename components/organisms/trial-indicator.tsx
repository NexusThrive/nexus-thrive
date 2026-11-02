"use client";

import Link from "next/link";
import { ChevronRight, Hourglass } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/molecules/popover";
import { cn } from "@/lib/utils";

/**
 * Indicador de la prueba en la barra superior (flujo de adquisición, `15-flujo-de-adquisicion-y-activacion.md`): cuántos días
 * quedan, cuándo termina, qué incluye y qué pasa al acabar. Es transparente: sin tarjeta, sin cobros automáticos.
 * Compacto en móvil («12 d»); con 3 días o menos se resalta para avisar a tiempo, sin bloquear nada.
 */
export function TrialIndicator({
  daysLeft,
  endsAt,
  planName,
  level,
  planHref,
}: {
  daysLeft: number;
  /** ISO de la fecha de fin. */
  endsAt: string;
  planName: string;
  level: "ok" | "soon" | "ended";
  /** Configuración, donde se ve el plan. */
  planHref: string;
}) {
  const end = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" }).format(new Date(endsAt));
  const dayWord = daysLeft === 1 ? "día" : "días";
  const soon = level !== "ok";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tour="trial"
          aria-label={`Prueba de Nexus: ${daysLeft} ${dayWord} restantes. Ver detalle`}
          className={cn(
            "inline-flex h-8 pointer-coarse:h-11 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors",
            soon ? "border-accent bg-accent text-accent-foreground hover:bg-accent-hover" : "border-border bg-surface-muted text-foreground hover:bg-surface-hover",
          )}
        >
          <Hourglass aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">Prueba · {daysLeft} {dayWord}</span>
          <span className="sm:hidden">{daysLeft} d</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(340px,calc(100vw-24px))] p-4">
        <h2 className="font-display text-sm font-semibold text-foreground">Tu prueba de Nexus</h2>
        <p className="mt-1 text-ui text-foreground">
          {level === "ended" ? "Tu prueba terminó." : <>Te {daysLeft === 1 ? "queda" : "quedan"} <b>{daysLeft} {dayWord}</b>. Termina el {end}.</>}
        </p>
        <dl className="mt-3 grid gap-2 text-xs">
          <div>
            <dt className="font-semibold text-foreground">Qué incluye</dt>
            <dd className="text-muted-foreground">Las funciones del plan {planName}, para que conozcas el sistema completo.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Sin tarjeta</dt>
            <dd className="text-muted-foreground">No pedimos medio de pago ni cobramos nada. Al terminar, tu negocio sigue en el plan gratuito.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Cómo aprovecharla</dt>
            <dd className="text-muted-foreground">
              Completa tus primeros pasos (el círculo con «!» de la barra superior) y registra algo real: un cliente o un cobro.
            </dd>
          </div>
        </dl>
        <Link href={planHref} className="mt-3 inline-flex text-xs font-semibold text-accent-text hover:underline">
          Ver mi plan
        </Link>
      </PopoverContent>
    </Popover>
  );
}

/**
 * La prueba dentro de la hoja «Más» del móvil (donde ya no cabe el indicador de la barra): los días que quedan, cuándo
 * termina y un enlace a Ajustes. Mismos niveles de aviso que `TrialIndicator`.
 */
export function TrialNote({ daysLeft, endsAt, level, planName, planHref }: { daysLeft: number; endsAt: string; level: "ok" | "soon" | "ended"; planName: string; planHref: string }) {
  const end = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" }).format(new Date(endsAt));
  const dayWord = daysLeft === 1 ? "día" : "días";
  const soon = level !== "ok";
  return (
    <Link href={planHref} className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", soon ? "bg-accent text-accent-foreground" : "bg-surface text-foreground ring-1 ring-border")}>
        <Hourglass aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-ui font-semibold">{level === "ended" ? "Tu prueba terminó" : `Prueba · ${daysLeft} ${dayWord}`}</span>
        <span className="block truncate text-xs text-muted-foreground">{level === "ended" ? `Plan ${planName}` : `Plan ${planName} · termina el ${end}`}</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
