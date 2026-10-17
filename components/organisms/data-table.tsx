import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tabla NEXUS THRIVE: cabecera Inter 600 12 px muted con `white-space: nowrap`,
 * filas de 56 px, cifras tabulares y alineadas a la derecha, contenedor con
 * scroll horizontal y primera columna pegajosa. La tabla nunca se corta.
 */
export function DataTable({
  children,
  className,
  minWidth = 720,
}: {
  children: ReactNode;
  className?: string;
  minWidth?: number;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          "nx-table min-w-full [&_td]:h-14 [&_th]:whitespace-nowrap [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground",
          "[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10 [&_td:first-child]:bg-card",
          "[&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:z-10 [&_th:first-child]:bg-card",
          className,
        )}
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

/** Celda de encabezado: Inter 600 12 px muted, sin salto de línea. */
export const tableHeadClasses =
  "h-11 whitespace-nowrap border-b border-border-strong bg-card px-3.5 text-left text-xs font-semibold text-muted-foreground";

/** Celda de cuerpo: alto de fila por densidad (56 px; 46 en compacta). */
export const tableCellClasses = "h-[var(--row-h)] whitespace-nowrap border-b border-border px-3.5";

/** Fila con fondo al pasar el cursor. */
export const tableRowClasses = "transition-colors duration-200 hover:bg-surface-muted";

/** Contenedor con borde y scroll horizontal (la tabla nunca se corta). */
export const tableWrapClasses = "overflow-x-auto rounded-lg border border-border bg-card";
