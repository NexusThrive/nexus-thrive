import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fila de ajuste: nombre y explicación a la izquierda, el control a la
 * derecha (interruptor, segmentado, botón). Se apilan dentro de una tarjeta
 * separadas por una línea.
 */
export function SettingsRow({
  title,
  description,
  control,
  htmlFor,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  /** id del control, para que el nombre sea su etiqueta. */
  htmlFor?: string;
  className?: string;
}) {
  const Title = htmlFor ? "label" : "p";
  return (
    <div className={cn("flex items-center justify-between gap-3.5 border-b border-border px-[18px] py-3.5 last:border-b-0", className)}>
      <div className="min-w-0">
        <Title {...(htmlFor ? { htmlFor } : {})} className="block font-medium text-foreground">
          {title}
        </Title>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
