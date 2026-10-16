"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { MasterPackSummary } from "@/lib/apu-importer/master-pack-summary";
import type { MasterPackImportResult } from "@/lib/apu-importer/master-pack-import";

const number = new Intl.NumberFormat("es-CO");

function Stat({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/60 p-3">
      <p className="text-2xl font-semibold tabular-nums text-foreground">{number.format(value)}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

/** Resumen de un pack APU completo antes de importarlo. */
export function MasterPackPreview({
  summary,
  pending,
  error,
  onImport,
  onReset,
}: {
  summary: MasterPackSummary;
  pending: boolean;
  error: string;
  onImport: (updatePrices: boolean) => void;
  onReset: () => void;
}) {
  const [updatePrices, setUpdatePrices] = useState(true);
  const mismatches = summary.verification.mismatches;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
          <span className="font-medium">{summary.fileName}</span>
          <Badge variant="gold">pack APU completo</Badge>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          Cambiar archivo
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Contenido del archivo</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat value={summary.sheets.chapters} label="capítulos" />
          <Stat value={summary.sheets.activities} label="actividades APU" />
          <Stat value={summary.sheets.auxiliaries} label="APU auxiliares" />
          <Stat value={summary.sheets.materials} label="materiales" />
          <Stat value={summary.sheets.lines} label="líneas de APU" />
          <Stat value={summary.sheets.images} label="fotos de insumos" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Qué cambia en tu catálogo</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Actividades nuevas / ya existentes</dt>
              <dd className="tabular-nums font-medium text-foreground">
                {number.format(summary.activities.new)} / {number.format(summary.activities.existing)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Insumos nuevos / ya existentes</dt>
              <dd className="tabular-nums font-medium text-foreground">
                {number.format(summary.items.new)} / {number.format(summary.items.existing)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Precios distintos al catálogo</dt>
              <dd className="tabular-nums font-medium text-foreground">
                {number.format(summary.items.priceChanges)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Fotos nuevas</dt>
              <dd className="tabular-nums font-medium text-foreground">
                {number.format(summary.imagesNew)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Líneas que agregaste a mano</dt>
              <dd className="tabular-nums font-medium text-foreground">
                {number.format(summary.manualLines)} se conservan
              </dd>
            </div>
          </dl>
          {summary.lastImport ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Última importación: {summary.lastImport.fileName}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "rounded-lg border bg-card p-4",
            mismatches.length ? "border-gold-300" : "border-success/30",
          )}
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck aria-hidden="true" className={cn("h-4 w-4", mismatches.length ? "text-gold-700" : "text-success")} />
            Verificación de costos
          </h2>
          {mismatches.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Los {number.format(summary.verification.checked)} APU dan el mismo costo directo que el
              archivo.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-gold-700">
                {mismatches.length} APU no cuadran con el costo directo del archivo. Se importan igual, tal
                como vienen; revísalos después en el catálogo.
              </p>
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {mismatches.map((m) => (
                  <li key={m.sourceKey} className="tabular-nums">
                    {m.name}: archivo {m.reference} · calculado {m.computed}
                  </li>
                ))}
              </ul>
            </>
          )}
          <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-muted-foreground">
            <li>Cada línea se guarda con su sección, unidad, cantidad, precio y parcial del archivo.</li>
            <li>Las fotos quedan guardadas en el sistema, no como enlaces.</li>
            <li>Nada que no venga en el archivo se borra. Los presupuestos de obra no cambian.</li>
          </ul>
        </div>
      </div>

      {summary.warnings.length > 0 && (
        <details className="rounded-lg border border-gold-300 bg-gold-100/60 p-4">
          <summary className="cursor-pointer text-sm font-medium text-gold-700">
            {summary.warnings.length} aviso(s) del archivo
          </summary>
          <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs text-gold-700">
            {summary.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </details>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="pack-update-prices" className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            id="pack-update-prices"
            type="checkbox"
            checked={updatePrices}
            onChange={(event) => setUpdatePrices(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border"
          />
          <span>
            Actualizar el precio de los insumos que ya existen. El precio anterior queda en el
            historial.
          </span>
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => onImport(updatePrices)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-gold-600",
            pending && "cursor-not-allowed opacity-50 hover:bg-gold-500",
          )}
        >
          {pending ? (
            <>
              <NLoader size={16} className="text-current" />
              Importando…
            </>
          ) : (
            <>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
              Importar catálogo
            </>
          )}
        </button>
      </div>
    </section>
  );
}

/** Resultado de una importación de pack APU. */
export function MasterPackResult({
  tenantSlug,
  result,
  message,
  onReset,
}: {
  tenantSlug: string;
  result: MasterPackImportResult;
  message: string;
  onReset: () => void;
}) {
  return (
    <section className="rounded-lg border border-success/30 bg-card p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-success/10 text-success">
          <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Importación completada</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              value={result.activities.created + result.activities.updated + result.activities.unchanged + result.activities.adopted}
              label="actividades"
              hint={`${result.activities.created} nuevas · ${result.activities.updated + result.activities.adopted} actualizadas`}
            />
            <Stat
              value={result.items.created + result.items.updated + result.items.unchanged + result.items.adopted}
              label="insumos"
              hint={`${result.items.created} nuevos · ${result.prices.changed} precios cambiados`}
            />
            <Stat value={result.lines.written} label="líneas de APU" hint={`${result.lines.manualKept} manuales conservadas`} />
            <Stat
              value={result.images.stored + result.images.reused}
              label="fotos"
              hint={`${result.images.stored} nuevas · ${result.images.linked} insumos con foto`}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/${tenantSlug}/quotes`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Ver catálogo
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              Importar otro archivo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
