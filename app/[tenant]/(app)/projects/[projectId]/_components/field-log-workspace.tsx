"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HardHat, ImagePlus, Trash2, User, X } from "lucide-react";
import { KpiCard } from "@/components/molecules/kpi-card";
import { EmptyState } from "@/components/molecules/empty-state";
import { NLoader } from "@/components/atoms/n-loader";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { formatDateShort } from "@/lib/format";
import { getLogSummaryStats, type FieldLogEntryData } from "@/lib/construction/field-log-engine";
import type { FieldLogData } from "@/lib/tenant/db";
import type { ItemProgressRow } from "@/lib/construction/progress";
import { createFieldLogEntryAction, deleteFieldLogEntryAction } from "../field-log/actions";
import ProgressPanel from "./progress-panel";
import { fieldClasses, inputClasses, labelClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<FieldLogEntryData["type"], { label: string; className: string }> = {
  ADVANCE: { label: "Avance", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  OBSERVATION: { label: "Observación", className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  AUTHORIZATION: { label: "Autorización", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  INCIDENT: { label: "Incidente", className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};

const WEATHER_LABELS: Record<FieldLogEntryData["weather"], string> = {
  SUNNY: "Soleado",
  CLOUDY: "Nublado",
  RAIN_LIGHT: "Lluvia ligera",
  RAIN_HEAVY: "Lluvia fuerte",
};

const inputClass =
  inputClasses;

function bogotaTodayIso(): string {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

export default function FieldLogWorkspace({
  tenantSlug,
  projectId,
  log,
  itemProgress,
  contracted,
}: {
  tenantSlug: string;
  projectId: string;
  log: FieldLogData;
  /** Partidas con su avance (enlace opcional de anotaciones y actas). */
  itemProgress: ItemProgressRow[];
  /** Obra contratada: habilita el registro de avance. */
  contracted: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const entries = log.entries;
  const stats = useMemo(() => getLogSummaryStats(entries), [entries]);
  const itemLabel = useMemo(
    () => new Map(itemProgress.map((item) => [item.itemId, `${item.code} · ${item.description}`])),
    [itemProgress],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Registros totales" value={String(stats.totalEntries)} hint={`Promedio personal: ${stats.averageLabor} / anotación`} />
        <KpiCard label="Avances de obra" value={String(stats.advancesCount)} hint="Anotaciones tipo avance" />
        <KpiCard label="Incidentes" value={String(stats.incidentsCount)} hint="Anotaciones tipo incidente" />
        <KpiCard label="Fotografías" value={String(stats.totalPhotos)} hint="Evidencias registradas" />
      </div>

      <ProgressPanel tenantSlug={tenantSlug} projectId={projectId} items={itemProgress} contracted={contracted} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Diario de obra — {log.name}</h2>
          <p className="text-xs text-muted-foreground">
            {entries.length} anotación{entries.length !== 1 ? "es" : ""}
          </p>
        </div>
        {!showForm ? <Button onClick={() => setShowForm(true)}>Nueva anotación</Button> : null}
      </div>

      {showForm ? (
        <NewEntryForm
          tenantSlug={tenantSlug}
          projectId={projectId}
          items={itemProgress}
          onClose={() => setShowForm(false)}
        />
      ) : null}

      <div className="rounded-lg border border-border bg-card">
        {entries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Bitácora vacía"
              description="Registra la primera anotación de campo para iniciar el diario de obra."
              action={<Button onClick={() => setShowForm(true)}>Crear primera anotación</Button>}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <FieldLogEntryCard
                key={entry.id}
                entry={entry}
                itemLabel={entry.budgetItemId ? (itemLabel.get(entry.budgetItemId) ?? null) : null}
                tenantSlug={tenantSlug}
                projectId={projectId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldLogEntryCard({
  entry,
  itemLabel,
  tenantSlug,
  projectId,
}: {
  entry: FieldLogEntryData;
  itemLabel: string | null;
  tenantSlug: string;
  projectId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const type = TYPE_STYLES[entry.type];

  const remove = () =>
    startTransition(async () => {
      const result = await deleteFieldLogEntryAction(tenantSlug, projectId, entry.id, { status: "idle" }, new FormData());
      if (result.status === "ok") {
        router.refresh();
      } else {
        setError(result.message ?? "No se pudo eliminar la anotación.");
        setConfirming(false);
      }
    });

  return (
    <article className="p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={type.className}>{type.label}</Badge>
          <Badge variant="outline">{WEATHER_LABELS[entry.weather]}</Badge>
          {itemLabel ? <span className="text-xs text-muted-foreground">{itemLabel}</span> : null}
        </div>
        <span className="text-xs text-muted-foreground">{formatDateShort(entry.entryDate)}</span>
      </div>

      <h3 className="font-display text-[15px] font-medium text-foreground">{entry.title}</h3>
      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{entry.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <HardHat aria-hidden="true" className="h-3.5 w-3.5" />
          {entry.laborCount} operario{entry.laborCount !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1">
          <User aria-hidden="true" className="h-3.5 w-3.5" />
          {entry.authorName} ({entry.authorRole})
        </span>
      </div>

      {entry.photoUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.photoUrls.map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block size-20 overflow-hidden rounded-lg border border-border bg-muted"
              aria-label={`Ver fotografía ${idx + 1} ampliada`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- foto servida por la API propia o enlace heredado */}
              <img src={url} alt={`Evidencia ${idx + 1}`} className="size-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
        {confirming ? (
          <>
            <span className="text-xs text-muted-foreground">¿Eliminar esta anotación?</span>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              No
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={remove} disabled={pending}>
              {pending ? <NLoader size={12} className="text-current" /> : null}
              Sí, eliminar
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            Eliminar
          </Button>
        )}
      </div>
    </article>
  );
}

function NewEntryForm({
  tenantSlug,
  projectId,
  items,
  onClose,
}: {
  tenantSlug: string;
  projectId: string;
  items: ItemProgressRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const submit = (formData: FormData) =>
    startTransition(async () => {
      setErrors({});
      setMessage(null);
      const result = await createFieldLogEntryAction(tenantSlug, projectId, { status: "idle" }, formData);
      if (result.status === "ok") {
        router.refresh();
        onClose();
      } else {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? "Revisa los campos del formulario.");
      }
    });

  const fieldError = (field: string) =>
    errors[field]?.[0] ? <span className="mt-1 block text-xs text-destructive">{errors[field]![0]}</span> : null;

  return (
    <form action={submit} className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Nueva anotación de campo</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor="fl-type" className="block">
          <span className={labelClasses}>Tipo</span>
          <select id="fl-type" name="type" defaultValue="ADVANCE" className={inputClass}>
            {Object.entries(TYPE_STYLES).map(([value, style]) => (
              <option key={value} value={value}>
                {style.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="fl-date" className="block">
          <span className={labelClasses}>Fecha</span>
          <input id="fl-date" name="entryDate" type="date" required defaultValue={bogotaTodayIso()} max={bogotaTodayIso()} className={inputClass} />
          {fieldError("entryDate")}
        </label>
        <label htmlFor="fl-title" className="block sm:col-span-2">
          <span className={labelClasses}>Título</span>
          <input id="fl-title" name="title" required maxLength={150} placeholder="Fundida de placa nivel 2" className={inputClass} />
          {fieldError("title")}
        </label>
        <label htmlFor="fl-description" className="block sm:col-span-2">
          <span className={labelClasses}>Descripción</span>
          <textarea
            id="fl-description"
            name="description"
            required
            rows={4}
            maxLength={4000}
            className={cn(fieldClasses, "py-2 w-full")}
          />
          {fieldError("description")}
        </label>
        <label htmlFor="fl-weather" className="block">
          <span className={labelClasses}>Clima</span>
          <select id="fl-weather" name="weather" defaultValue="SUNNY" className={inputClass}>
            {Object.entries(WEATHER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="fl-labor" className="block">
          <span className={labelClasses}>Personal en obra</span>
          <input id="fl-labor" name="laborCount" type="number" min={0} max={1000} defaultValue={0} className={inputClass} />
          {fieldError("laborCount")}
        </label>
        {items.length > 0 ? (
          <label htmlFor="fl-item" className="block sm:col-span-2">
            <span className={labelClasses}>Partida del presupuesto (opcional)</span>
            <select id="fl-item" name="budgetItemId" defaultValue="" className={inputClass}>
              <option value="">Sin partida</option>
              {items.map((item) => (
                <option key={item.itemId} value={item.itemId}>
                  {item.code} · {item.description}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="sm:col-span-2">
          <label htmlFor="fl-photos" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition hover:border-border-strong hover:bg-muted/50">
            <ImagePlus aria-hidden="true" className="h-4 w-4" />
            Agregar fotos (hasta 10, máx. 2 MB c/u)
          </label>
          <input
            id="fl-photos"
            name="photos"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="sr-only"
            onChange={(event) =>
              setPreviews(Array.from(event.target.files ?? []).slice(0, 10).map((file) => URL.createObjectURL(file)))
            }
          />
          {previews.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, index) => (
                // eslint-disable-next-line @next/next/no-img-element -- vista previa local
                <img key={index} src={src} alt="" className="size-16 rounded-md border border-border object-cover" />
              ))}
            </div>
          ) : null}
          {fieldError("photoUrls")}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        {message ? <span role="alert" className="text-xs text-destructive">{message}</span> : null}
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <NLoader size={14} className="text-current" /> : null}
          Guardar anotación
        </Button>
      </div>
    </form>
  );
}
