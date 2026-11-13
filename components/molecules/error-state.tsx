"use client";

import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { cn } from "@/lib/utils";

/**
 * Estado de error de carga (nivel 3 del sistema, DR-09): cuando una pantalla o un
 * bloque no se pudo mostrar. Dice qué pasó, qué se puede hacer y, si existe, una
 * referencia para soporte. Es el hermano de `EmptyState` (que explica un vacío) y
 * de `Alert` (que acompaña a un formulario): este ocupa el lugar del contenido.
 *
 * - `role="alert"` anuncia el fallo una vez; el título es un encabezado para que
 *   la persona se oriente con lector de pantalla.
 * - Centrado en el panel, con icono en círculo y halo; botones en píldora y la referencia como etiqueta discreta.
 * - Una sola acción principal (`Reintentar`); `action` añade la salida alternativa
 *   (volver al inicio) sin competir con ella.
 * - `variant="block"` es para un bloque dentro de una página que sigue funcionando.
 */
export function ErrorState({
  title = "No pudimos mostrar esta pantalla",
  description = "Intenta de nuevo. Si el problema continúa, avísanos con la referencia.",
  onRetry,
  retryLabel = "Reintentar",
  action,
  reference,
  variant = "page",
  headingLevel = 2,
  className,
}: {
  title?: string;
  description?: string;
  /** Vuelve a pedir el contenido (en `error.tsx`, el `reset` de Next). */
  onRetry?: () => void;
  retryLabel?: string;
  /** Salida alternativa: normalmente un enlace a «Inicio». */
  action?: ReactNode;
  /** Identificador del error (p. ej. `error.digest`) para soporte. */
  reference?: string;
  variant?: "page" | "block";
  headingLevel?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as const;
  const page = variant === "page";
  return (
    <div
      role="alert"
      className={cn(
        "grid w-full place-items-center text-center",
        page ? "min-h-[calc(100dvh-var(--topbar-height)-9rem)] px-6 py-16" : "rounded-(--radius-widget) border border-border/60 bg-card px-6 py-12",
        className,
      )}
    >
      <div className="grid max-w-md justify-items-center gap-2">
        {/* Icono en círculo con halo suave, sin bordes ni fondos duros. */}
        <span aria-hidden="true" className="relative mb-4 grid size-28 place-items-center">
          <span className="absolute inset-0 rounded-full bg-danger-subtle/40" />
          <span className="absolute inset-3 rounded-full bg-danger-subtle/70" />
          <span className="relative grid size-14 place-items-center rounded-full bg-card text-danger shadow-xs">
            <AlertTriangle className="size-6" strokeWidth={1.8} />
          </span>
        </span>
        <Heading className="font-display text-2xl font-medium tracking-tight text-foreground">{title}</Heading>
        <p className="text-base text-muted-foreground">{description}</p>
        {onRetry || action ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {onRetry ? (
              <Button variant="accent" size="lg" className="rounded-full px-7" onClick={onRetry}>
                <RotateCw aria-hidden="true" className="size-4" /> {retryLabel}
              </Button>
            ) : null}
            {action}
          </div>
        ) : null}
        {reference ? (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface-muted px-3.5 py-1.5 text-xs text-muted-foreground">
            Referencia <code className="font-mono text-foreground">{reference}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}
