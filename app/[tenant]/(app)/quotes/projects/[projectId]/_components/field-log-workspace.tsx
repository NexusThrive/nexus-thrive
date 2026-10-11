"use client";

import { useMemo, useState } from "react";
import { KpiCard } from "@/components/brand/kpi-card";
import { EmptyState } from "@/components/brand/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateShort, formatDateTime } from "@/lib/format";
import {
  getLogSummaryStats,
  fieldNoteTypeLabel,
  weatherConditionLabel,
  type FieldLogEntryData,
} from "@/lib/field-log-engine";
import type { FieldLogData } from "@/lib/tenant-db";
import { getOrCreateFieldLogAction } from "../field-log/actions";

const IDLE: any = { status: "idle" };

function typeBadge(type: FieldLogEntryData["type"]) {
  switch (type) {
    case "ADVANCE":
      return <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">AVANCE</Badge>;
    case "OBSERVATION":
      return <Badge className="border-sky-400/30 bg-sky-400/10 text-sky-300">OBSERVACIÓN</Badge>;
    case "AUTHORIZATION":
      return <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-300">AUTORIZACIÓN</Badge>;
    case "INCIDENT":
      return <Badge className="border-rose-400/30 bg-rose-400/10 text-rose-300">INCIDENTE</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function weatherBadge(weather: FieldLogEntryData["weather"]) {
  switch (weather) {
    case "SUNNY":
      return <Badge variant="outline" className="text-amber-300 border-amber-400/30">☀️ Soleado</Badge>;
    case "CLOUDY":
      return <Badge variant="outline" className="text-slate-300 border-slate-400/30">☁️ Nublado</Badge>;
    case "RAIN_LIGHT":
      return <Badge variant="outline" className="text-blue-300 border-blue-400/30">🌦️ Lluvia ligera</Badge>;
    case "RAIN_HEAVY":
      return <Badge variant="outline" className="text-indigo-300 border-indigo-400/30">🌧️ Lluvia fuerte</Badge>;
    default:
      return <Badge variant="outline">{weather}</Badge>;
  }
}

export default function FieldLogWorkspace({
  tenantSlug,
  projectId,
  log,
  currentUserName,
  currentUserRole,
}: {
  tenantSlug: string;
  projectId: string;
  log: FieldLogData;
  /** Nombre y rol del usuario en sesión (autor de las anotaciones). */
  currentUserName: string;
  currentUserRole: string;
}) {
  const [, init] = useState(() => {
    // Trigger initial load via action if needed
  });
  const [showModal, setShowModal] = useState(false);
  const [entries, setEntries] = useState(log.entries);

  const stats = useMemo(
    () => getLogSummaryStats(entries),
    [entries],
  );

  const handleEntryCreated = (newEntry: FieldLogEntryData) => {
    setEntries((prev) => [newEntry, ...prev]);
    setShowModal(false);
  };

  const handleEntryDeleted = (entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Registros totales"
          value={String(stats.totalEntries)}
          hint={`Promedio personal: ${stats.averageLabor} / anotación`}
        />
        <KpiCard
          label="Avances de obra"
          value={String(stats.advancesCount)}
          hint="Anotaciones tipo AVANCE"
        />
        <KpiCard
          label="Incidentes / alertas SISOMA"
          value={String(stats.incidentsCount)}
          hint="Anotaciones tipo INCIDENTE"
        />
        <KpiCard
          label="Total fotografías"
          value={String(stats.totalPhotos)}
          hint="Evidencias registradas"
        />
      </div>

      {/* Header con botón nueva anotación */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Diario Oficial de Obra — {log.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {entries.length} anotación{entries.length !== 1 ? "es" : ""} registrada{entries.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>Nueva anotación</Button>
      </div>

      {/* Timeline / Feed cronológico */}
      <div className="rounded-lg border border-border bg-card">
        {entries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Bitácora vacía"
              description="Registra la primera anotación de campo para iniciar el diario oficial de obra."
              action={<Button onClick={() => setShowModal(true)}>Crear primera anotación</Button>}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <FieldLogEntryCard
                key={entry.id}
                entry={entry}
                onDelete={() => handleEntryDeleted(entry.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Nueva Anotación */}
      {showModal && (
        <NewEntryModal
          tenantSlug={tenantSlug}
          projectId={projectId}
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
          onClose={() => setShowModal(false)}
          onCreated={handleEntryCreated}
        />
      )}
    </div>
  );
}

function FieldLogEntryCard({
  entry,
  onDelete,
}: {
  entry: FieldLogEntryData;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 hover:bg-accent/10 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {typeBadge(entry.type)}
          {weatherBadge(entry.weather)}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>{formatDateShort(entry.entryDate)}</div>
        </div>
      </div>

      <h3 className="font-medium text-foreground">{entry.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          👷 {entry.laborCount} operario{entry.laborCount !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          👤 {entry.authorName} ({entry.authorRole})
        </span>
      </div>

      {entry.photoUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.photoUrls.map((url, idx) => (
            <PhotoThumbnail key={idx} url={url} />
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-rose-400 hover:bg-rose-400/10"
          onClick={onDelete}
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}

function PhotoThumbnail({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block size-20 rounded-lg overflow-hidden border border-border bg-muted"
      aria-label="Ver fotografía ampliada"
    >
      <img
        src={url}
        alt="Evidencia fotográfica"
        className="size-full object-cover"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </a>
  );
}

function NewEntryModal({
  tenantSlug,
  projectId,
  currentUserName,
  currentUserRole,
  onClose,
  onCreated,
}: {
  tenantSlug: string;
  projectId: string;
  currentUserName: string;
  currentUserRole: string;
  onClose: () => void;
  onCreated: (entry: FieldLogEntryData) => void;
}) {
  const [, formAction] = useState(() => ({ status: "idle" }));
  const [formState, setFormState] = useState<{
    type: "ADVANCE" | "OBSERVATION" | "AUTHORIZATION" | "INCIDENT";
    entryDate: string;
    title: string;
    description: string;
    weather: "SUNNY" | "CLOUDY" | "RAIN_LIGHT" | "RAIN_HEAVY";
    laborCount: number;
    photoUrls: string;
  }>({
    type: "ADVANCE",
    entryDate: new Date().toISOString().split("T")[0],
    title: "",
    description: "",
    weather: "SUNNY",
    laborCount: 0,
    photoUrls: "",
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Convert photoUrls string to array
    const urls = formState.photoUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    const formData = new FormData();
    formData.append("type", formState.type);
    formData.append("entryDate", formState.entryDate);
    formData.append("title", formState.title);
    formData.append("description", formState.description);
    formData.append("weather", formState.weather);
    formData.append("laborCount", String(formState.laborCount));
    urls.forEach((u) => formData.append("photoUrls", u));

    try {
      const { createFieldLogEntryAction } = await import(
        "../field-log/actions"
      );
      const result = await createFieldLogEntryAction(
        tenantSlug,
        projectId,
        { status: "idle" },
        formData,
      );

      if (result.status === "ok") {
        // Optimistically add the entry (we'll get real data on next render)
        const newEntry: FieldLogEntryData = {
          id: "temp-" + Date.now(),
          type: formState.type,
          entryDate: formState.entryDate,
          title: formState.title,
          description: formState.description,
          weather: formState.weather,
          laborCount: formState.laborCount,
          authorName: currentUserName,
          authorRole: currentUserRole,
          photoUrls: urls,
        };
        onCreated(newEntry);
        onClose();
        // Reset form
        setFormState({
          type: "ADVANCE",
          entryDate: new Date().toISOString().split("T")[0],
          title: "",
          description: "",
          weather: "SUNNY",
          laborCount: 0,
          photoUrls: "",
        });
      } else {
        setErrors(result.errors ?? {});
      }
    } catch {
      setErrors({ _form: ["Error inesperado al guardar."] });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Nueva anotación de campo</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ✕
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tipo de anotación *
              </label>
              <select
                value={formState.type}
                onChange={(e) => setFormState({ ...formState, type: e.target.value as "ADVANCE" | "OBSERVATION" | "AUTHORIZATION" | "INCIDENT" })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="ADVANCE">AVANCE</option>
                <option value="OBSERVATION">OBSERVACIÓN</option>
                <option value="AUTHORIZATION">AUTORIZACIÓN</option>
                <option value="INCIDENT">INCIDENTE</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-xs text-destructive">{errors.type[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Fecha del registro *
              </label>
              <input
                type="date"
                value={formState.entryDate}
                onChange={(e) => setFormState({ ...formState, entryDate: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              {errors.entryDate && (
                <p className="mt-1 text-xs text-destructive">{errors.entryDate[0]}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Título *
            </label>
            <input
              type="text"
              value={formState.title}
              onChange={(e) => setFormState({ ...formState, title: e.target.value })}
              maxLength={120}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Descripción *
            </label>
            <textarea
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              maxLength={2000}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-destructive">{errors.description[0]}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Clima *
              </label>
              <select
                value={formState.weather}
                onChange={(e) => setFormState({ ...formState, weather: e.target.value as "SUNNY" | "CLOUDY" | "RAIN_LIGHT" | "RAIN_HEAVY" })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="SUNNY">Soleado</option>
                <option value="CLOUDY">Nublado</option>
                <option value="RAIN_LIGHT">Lluvia ligera</option>
                <option value="RAIN_HEAVY">Lluvia fuerte</option>
              </select>
              {errors.weather && (
                <p className="mt-1 text-xs text-destructive">{errors.weather[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Nº operarios *
              </label>
              <input
                type="number"
                value={formState.laborCount}
                onChange={(e) => setFormState({ ...formState, laborCount: Number(e.target.value) })}
                min={0}
                max={1000}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              {errors.laborCount && (
                <p className="mt-1 text-xs text-destructive">{errors.laborCount[0]}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              URLs de fotos (HTTPS, una por línea, máx 10)
            </label>
            <textarea
              value={formState.photoUrls}
              onChange={(e) => setFormState({ ...formState, photoUrls: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-xs"
              placeholder="https://ejemplo.com/foto1.jpg&#10;https://ejemplo.com/foto2.jpg"
            />
            {errors.photoUrls && (
              <p className="mt-1 text-xs text-destructive">{errors.photoUrls[0]}</p>
            )}
          </div>

          {errors._form && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {errors._form[0]}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar anotación"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}