"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { tableCellClasses, tableHeadClasses, tableRowClasses } from "./data-table";

/**
 * Tabla adaptable (DR-08, `11` §4): una sola definición de columnas que se pinta como **tabla** cuando el contenedor es
 * ancho y como **lista** cuando es angosto. Sin desplazamiento horizontal y sin recortar datos.
 *
 * - Cada columna declara su **rol**: `primary` identifica el registro, `secondary` lo apoya, `status` es un estado (con
 *   texto + icono, nunca solo color), `figure` es una cifra (alineada a la derecha, tabular), `detail` es un dato más
 *   (en la lista aparece como «Etiqueta: valor») y `action` son las acciones de la fila.
 * - El cambio es por el ancho del **propio contenedor**, no por el de la pantalla: dentro de una
 *   columna angosta de escritorio también pasa a lista.
 * - Una sola representación en el DOM: el componente mide su contenedor y renderiza la tabla (≥ 672 px) o la lista. Antes
 *   de medir (render del servidor) pinta ambas con CSS para no parpadear; al montar deja solo la que corresponde, así un
 *   lector de pantalla o una prueba recorren un único conjunto de datos.
 * - Es un componente de cliente: sus columnas llevan funciones, así que se usa desde vistas de cliente.
 */
/** Ancho de contenedor desde el que la tabla cabe sin recortar (por omisión; cada uso puede pedir otro). */
const TABLE_MIN_WIDTH = 800;
export type ColumnRole = "primary" | "secondary" | "status" | "figure" | "detail" | "action";

export type AdaptiveColumn<T> = {
  key: string;
  /** Encabezado visible en la tabla y etiqueta del dato en la lista. */
  header: string;
  role: ColumnRole;
  cell: (row: T) => ReactNode;
  /** Solo para `detail` y `figure`: no mostrar en la lista. */
  hideInList?: boolean;
  /** Alinea la columna a la derecha en la tabla (las cifras y las acciones ya lo hacen). */
  align?: "right";
  /** Ancho mínimo de la columna en la tabla (clase de Tailwind, p. ej. `min-w-40`). */
  className?: string;
};

export function AdaptiveTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  getRowHref,
  rowLabel,
  empty,
  rowClassName,
  tableMinWidth = TABLE_MIN_WIDTH,
  footer,
  className,
}: {
  /** Nombre de la tabla para lectores de pantalla (no se ve). */
  caption: string;
  columns: AdaptiveColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Si existe, la fila entera lleva a su detalle. */
  getRowHref?: (row: T) => string;
  /** Nombre accesible del enlace de la fila (por defecto, el contenido de la celda principal). */
  rowLabel?: (row: T) => string;
  /** Qué se muestra cuando no hay filas (un `EmptyState`). */
  empty?: ReactNode;
  /** Clases extra por fila (p. ej. atenuar un registro inactivo). */
  rowClassName?: (row: T) => string | undefined;
  /** Ancho de contenedor (px) desde el que la tabla cabe sin recortar; por debajo se muestra la lista. */
  tableMinWidth?: number;
  /** Fila de totales: aparece como pie de la tabla y como último elemento de la lista. `cells` va por clave de columna. */
  footer?: { label: string; cells: Record<string, ReactNode> };
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"table" | "list" | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setMode(el.clientWidth >= tableMinWidth ? "table" : "list");
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [rows.length, tableMinWidth]);

  if (rows.length === 0 && empty) return <div className={className}>{empty}</div>;

  const primary = columns.find((c) => c.role === "primary");
  const secondary = columns.filter((c) => c.role === "secondary");
  const status = columns.filter((c) => c.role === "status");
  const figures = columns.filter((c) => c.role === "figure" && !c.hideInList);
  const details = columns.filter((c) => c.role === "detail" && !c.hideInList);
  const actions = columns.filter((c) => c.role === "action");

  return (
    <div ref={ref} className={cn("@container overflow-hidden rounded-lg border border-border bg-card", className)}>
      {/* Tabla: contenedor ancho */}
      {mode !== "list" ? (
      <table className={cn("nx-table w-full text-ui", mode === null && "hidden @3xl:table")}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(tableHeadClasses, (c.role === "figure" || c.role === "action" || c.align === "right") && "text-right", c.className)}
              >
                {c.role === "action" ? <span className="sr-only">{c.header}</span> : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = getRowHref?.(row);
            return (
              <tr key={getRowId(row)} className={cn(tableRowClasses, href && "relative cursor-pointer", rowClassName?.(row))}>
                {columns.map((c) => {
                  const right = c.role === "figure" || c.role === "action" || c.align === "right";
                  const cls = cn(tableCellClasses, "whitespace-normal", right && "text-right tabular-nums");
                  if (c.role === "primary")
                    return (
                      <th key={c.key} scope="row" className={cn(cls, "text-left font-medium")}>
                        {href ? (
                          <Link href={href} aria-label={rowLabel?.(row)} className="text-foreground outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring">
                            {c.cell(row)}
                          </Link>
                        ) : (
                          c.cell(row)
                        )}
                      </th>
                    );
                  return (
                    <td key={c.key} className={cls}>
                      {c.cell(row)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        {footer ? (
          <tfoot>
            <tr className="bg-surface-muted font-semibold">
              {columns.map((c, i) => {
                const right = c.role === "figure" || c.role === "action" || c.align === "right";
                return i === 0 ? (
                  <th key={c.key} scope="row" className={cn(tableCellClasses, "text-left")}>{footer.label}</th>
                ) : (
                  <td key={c.key} className={cn(tableCellClasses, right && "text-right tabular-nums")}>{footer.cells[c.key] ?? null}</td>
                );
              })}
            </tr>
          </tfoot>
        ) : null}
      </table>
      ) : null}

      {/* Lista: contenedor angosto */}
      {mode !== "table" ? (
      <ul role="list" aria-label={caption} className={cn("divide-y divide-border", mode === null && "@3xl:hidden")}>
        {rows.map((row) => {
          const href = getRowHref?.(row);
          return (
            <li key={getRowId(row)} className={cn("relative flex items-start gap-3 px-4 py-3", href && "hover:bg-surface-muted", rowClassName?.(row))}>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {primary ? (
                      <div className="break-words text-sm font-medium text-foreground">
                        {href ? (
                          <Link href={href} aria-label={rowLabel?.(row)} className="outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring">
                            {primary.cell(row)}
                          </Link>
                        ) : (
                          primary.cell(row)
                        )}
                      </div>
                    ) : null}
                    {secondary.map((c) => (
                      <div key={c.key} className="break-words text-xs text-muted-foreground">
                        {c.cell(row)}
                      </div>
                    ))}
                  </div>
                  {figures.length > 0 ? (
                    <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                      {figures.map((c) => (
                        <div key={c.key}>{c.cell(row)}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {status.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{status.map((c) => <span key={c.key}>{c.cell(row)}</span>)}</div>
                ) : null}
                {details.length > 0 ? (
                  <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    {details.map((c) => (
                      <div key={c.key} className="contents">
                        <dt className="text-muted-foreground">{c.header}</dt>
                        <dd className="min-w-0 break-words text-foreground">{c.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
              {actions.length > 0 ? (
                <div className="relative z-10 flex shrink-0 items-center gap-1">{actions.map((c) => <span key={c.key}>{c.cell(row)}</span>)}</div>
              ) : null}
            </li>
          );
        })}
        {footer ? (
          <li className="bg-surface-muted px-4 py-3 text-sm font-semibold">
            <div className="flex items-baseline justify-between gap-3"><span>{footer.label}</span></div>
            <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
              {columns.filter((c) => footer.cells[c.key] != null).map((c) => (
                <div key={c.key} className="contents">
                  <dt className="font-normal text-muted-foreground">{c.header}</dt>
                  <dd className="text-right tabular-nums text-foreground">{footer.cells[c.key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ) : null}
      </ul>
      ) : null}
    </div>
  );
}
