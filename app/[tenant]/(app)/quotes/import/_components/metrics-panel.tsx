"use client";

import { cn } from "@/lib/cn";
import type { ConfidenceScore, ImportMetrics } from "@/lib/apu-importer/types";

const LEVEL_TONE: Record<ConfidenceScore["level"], string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-rose-50 text-rose-700 border-rose-200",
};

const LEVEL_LABEL: Record<ConfidenceScore["level"], string> = {
  high: "Confianza alta",
  medium: "Confianza media",
  low: "Confianza baja",
};

function Chip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", tone)}>{value}</span>
    </div>
  );
}

/**
 * Panel de métricas del análisis: score de confianza (0–100) + contadores
 * de filas, categorías inferidas y anomalías.
 */
export default function MetricsPanel({
  metrics,
  confidence,
  blockMode,
}: {
  metrics: ImportMetrics;
  confidence: ConfidenceScore;
  blockMode: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Confianza */}
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-500">Confianza del análisis</p>
            <p className={cn("mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", LEVEL_TONE[confidence.level])}>
              {LEVEL_LABEL[confidence.level]}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{confidence.label}</p>
          </div>
          <div
            className={cn(
              "grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 text-lg font-bold tabular-nums",
              confidence.value >= 85
                ? "border-emerald-200 text-emerald-700"
                : confidence.value >= 65
                  ? "border-amber-200 text-amber-700"
                  : "border-rose-200 text-rose-700",
            )}
          >
            {confidence.value}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span>Columnas: {confidence.breakdown.columns}</span>
          <span>Precios: {confidence.breakdown.priceValidity}</span>
          <span>Filas: {confidence.breakdown.rows}</span>
          <span>Categorías: {confidence.breakdown.categories}</span>
        </div>
      </article>

      {/* Contadores */}
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
        <p className="text-sm font-medium text-slate-500">
          {blockMode ? "Bloques APU detectados" : "Insumos detectados"}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Chip label="Filas totales" value={metrics.totalRows} tone="text-slate-700" />
          <Chip label="Válidas" value={metrics.validRows} tone="text-emerald-600" />
          <Chip label="Con aviso" value={metrics.warningRows} tone="text-amber-600" />
          <Chip label="Omitidas" value={metrics.omittedRows} tone="text-rose-600" />
          <Chip
            label={blockMode ? "Actividades" : "Insumos"}
            value={blockMode ? metrics.detectedActivities : metrics.detectedItems}
            tone="text-slate-700"
          />
          <Chip label="Categorías inferidas" value={metrics.inferredCategories} tone="text-amber-600" />
          <Chip label="Precios atípicos" value={metrics.priceOutliers} tone="text-orange-600" />
          <Chip
            label="Columnas mapeadas"
            value={metrics.mappedColumns}
            tone="text-slate-700"
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Las filas omitidas no se importan. Las filas con aviso se importan pero
          conviene revisarlas en la tabla.
        </p>
      </article>
    </div>
  );
}