"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ParsedRow } from "@/lib/apu-importer/types";

const PREVIEW_LIMIT = 50;

function StatusBadge({ row }: { row: ParsedRow }) {
  if (row.status === "OK") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
        <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
        OK
      </span>
    );
  }
  if (row.status === "WARNING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-medium text-gold-700">
        <AlertTriangle aria-hidden="true" className="h-3 w-3" />
        Aviso
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
      <XCircle aria-hidden="true" className="h-3 w-3" />
      Omitir
    </span>
  );
}

function ItemRow({ row }: { row: ParsedRow }) {
  const v = row.values;
  return (
    <tr className={cn("border-t border-border", row.status === "OMIT" && "bg-destructive/5")}>
      <td className="px-3 py-2">
        <StatusBadge row={row} />
        {row.reason && (
          <p className="mt-0.5 max-w-[220px] text-[10px] leading-tight text-muted-foreground">{row.reason}</p>
        )}
      </td>
      <td className="max-w-[220px] truncate px-3 py-2 text-sm text-foreground/80">{v.name || "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{v.code || "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{v.unit || "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-xs">{v.category || "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">
        {v.quantity || "1"}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-medium tabular-nums text-foreground/80">
        {v.unitPrice ? `$${Number(v.unitPrice).toLocaleString("es-CO", { maximumFractionDigits: 2 })}` : "—"}
      </td>
    </tr>
  );
}

function ActivityRow({ row }: { row: ParsedRow }) {
  const v = row.values;
  let lineCount = 0;
  let cost = 0;
  try {
    const lines = v.linesJson ? (JSON.parse(v.linesJson) as Array<{ quantity: string; unitPrice: string }>) : [];
    lineCount = lines.length;
    cost = lines.reduce((acc, line) => acc + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0);
  } catch {
    lineCount = 0;
  }
  return (
    <tr className={cn("border-t border-border", row.status === "OMIT" && "bg-destructive/5")}>
      <td className="px-3 py-2">
        <StatusBadge row={row} />
        {row.reason && (
          <p className="mt-0.5 max-w-[220px] text-[10px] leading-tight text-muted-foreground">{row.reason}</p>
        )}
      </td>
      <td className="max-w-[260px] truncate px-3 py-2 text-sm text-foreground/80">{v.activityName || "(sin nombre)"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{v.activityCode || "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{v.activityUnit || "—"}</td>
      <td className="whitespace-nowrap px-3 py-2 text-xs">{lineCount} líneas</td>
      <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">—</td>
      <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold tabular-nums text-foreground/80">
        {cost > 0 ? `$${Math.round(cost).toLocaleString("es-CO")}` : "—"}
      </td>
    </tr>
  );
}

/**
 * Primeras 50 filas del preview con estado por fila, en modalidad
 * insumo (tabla) o actividad (bloques APU).
 */
export default function PreviewTable({ rows, blockMode }: { rows: ParsedRow[]; blockMode: boolean }) {
  const shown = rows.slice(0, PREVIEW_LIMIT);
  const hidden = rows.length - shown.length;

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-foreground/80">
          Vista previa <span className="font-normal text-muted-foreground">(primeras {Math.min(PREVIEW_LIMIT, rows.length)} de {rows.length})</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">{blockMode ? "Actividad" : "Nombre"}</th>
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Unidad</th>
              <th className="px-3 py-2 font-medium">{blockMode ? "Composición" : "Categoría"}</th>
              <th className="px-3 py-2 text-right font-medium">Cant.</th>
              <th className="px-3 py-2 text-right font-medium">{blockMode ? "Costo directo' (aprox.)" : "Precio unitario"}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) =>
              row.kind === "activity" ? (
                <ActivityRow key={row.index} row={row} />
              ) : (
                <ItemRow key={row.index} row={row} />
              ),
            )}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No hay filas para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hidden > 0 && (
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          …y {hidden} filas más se importarán con estas reglas.
        </div>
      )}
    </article>
  );
}