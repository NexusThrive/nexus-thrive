"use client";

import { cn } from "@/lib/cn";
import type { ConfidenceScore, ImportMetrics } from "@/lib/construction/apu-importer/types";

const LEVEL_TONE: Record<ConfidenceScore["level"], string> = {
  high: "bg-success/10 text-success border-success/30",
  medium: "bg-gold-100 text-gold-700 border-gold-300",
  low: "bg-destructive/10 text-destructive border-destructive/30",
};

const LEVEL_LABEL: Record<ConfidenceScore["level"], string> = {
  high: "Confianza alta",
  medium: "Confianza media",
  low: "Confianza baja",
};

function Chip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
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
      <article className="rounded-lg border border-border bg-card p-4 sm:col-span-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Confianza del análisis</p>
            <p className={cn("mt-1 inline-flex rounded-sm border px-2 py-0.5 text-xs font-medium", LEVEL_TONE[confidence.level])}>
              {LEVEL_LABEL[confidence.level]}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{confidence.label}</p>
          </div>
          <div
            className={cn(
              "grid h-14 w-14 shrink-0 place-items-center rounded-sm border-4 text-lg font-bold tabular-nums",
              confidence.value >= 85
                ? "border-success/30 text-success"
                : confidence.value >= 65
                  ? "border-gold-300 text-gold-700"
                  : "border-destructive/30 text-destructive",
            )}
          >
            {confidence.value}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span>Columnas: {confidence.breakdown.columns}</span>
          <span>Precios: {confidence.breakdown.priceValidity}</span>
          <span>Filas: {confidence.breakdown.rows}</span>
          <span>Categorías: {confidence.breakdown.categories}</span>
        </div>
      </article>

      {/* Contadores */}
      <article className="rounded-lg border border-border bg-card p-4 sm:col-span-2">
        <p className="text-sm font-medium text-muted-foreground">
          {blockMode ? "Bloques APU detectados" : "Insumos detectados"}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Chip label="Filas totales" value={metrics.totalRows} tone="text-foreground/80" />
          <Chip label="Válidas" value={metrics.validRows} tone="text-success" />
          <Chip label="Con aviso" value={metrics.warningRows} tone="text-gold-700" />
          <Chip label="Omitidas" value={metrics.omittedRows} tone="text-destructive" />
          <Chip
            label={blockMode ? "Actividades" : "Insumos"}
            value={blockMode ? metrics.detectedActivities : metrics.detectedItems}
            tone="text-foreground/80"
          />
          <Chip label="Categorías inferidas" value={metrics.inferredCategories} tone="text-gold-700" />
          <Chip label="Precios atípicos" value={metrics.priceOutliers} tone="text-gold-700" />
          <Chip
            label="Columnas mapeadas"
            value={metrics.mappedColumns}
            tone="text-foreground/80"
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Las filas omitidas no se importan. Las filas con aviso se importan pero
          conviene revisarlas en la tabla.
        </p>
      </article>
    </div>
  );
}