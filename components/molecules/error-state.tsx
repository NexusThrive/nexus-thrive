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
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "page" ? "min-h-[50vh] px-6 py-16" : "rounded-lg border border-border bg-card px-6 py-10",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-md bg-danger-subtle text-danger"
      >
        <AlertTriangle className="size-6" />
      </span>
      <Heading className="mt-4 font-display text-lg font-semibold text-foreground">{title}</Heading>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry || action ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <Button onClick={onRetry}>
              <RotateCw aria-hidden="true" className="size-4" /> {retryLabel}
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
      {reference ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Referencia: <code className="font-mono">{reference}</code>
        </p>
      ) : null}
    </div>
  );
}
