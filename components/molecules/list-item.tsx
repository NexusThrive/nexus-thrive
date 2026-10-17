import type { ComponentProps, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fila de lista NEXUS THRIVE (min 62 px): adorno a la izquierda (IconTile o
 * Avatar), título 500 y subtítulo muted truncados, y un valor a la derecha
 * (monto en Montserrat tabular, hora, badge). Con `onClick`/`href` lo maneja
 * el contenedor; con `chevron` muestra la flecha de navegación.
 */
export function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  chevron = false,
  interactive = false,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  /** Fondo al pasar el cursor (filas que abren algo). */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[62px] items-center gap-3 border-b border-border bg-surface px-[18px] py-3 last:border-b-0",
        interactive && "cursor-pointer transition-colors duration-200 hover:bg-surface-muted",
        className,
      )}
      {...props}
    >
      {leading}
      <div className="min-w-0 flex-1 leading-[1.3]">
        <p className="truncate font-medium text-foreground">{title}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {trailing}
      {chevron ? <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /> : null}
    </div>
  );
}

/** Monto de una fila: + en tinta, − en rojo. */
export function Amount({
  value,
  negative = false,
  className,
}: {
  value: ReactNode;
  negative?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap font-display text-sm font-semibold tabular-nums",
        negative ? "text-danger" : "text-foreground",
        className,
      )}
    >
      {value}
    </span>
  );
}
