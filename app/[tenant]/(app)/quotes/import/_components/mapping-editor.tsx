"use client";

import { AlertTriangle, CheckCircle2, Columns3 } from "lucide-react";
import type { ColumnMapping, ImportTargetField } from "@/lib/apu-importer/types";

const TARGET_LABELS: Record<ImportTargetField, string> = {
  code: "Código",
  name: "Nombre / Descripción",
  unit: "Unidad",
  unitPrice: "Precio unitario",
  quantity: "Cantidad / Rend.",
  category: "Categoría",
  activityCode: "Código actividad",
  activityName: "Nombre actividad",
  activityUnit: "Unidad actividad",
  linesJson: "Composiciones",
  section: "Sección",
};

const EDITABLE_TARGETS: ImportTargetField[] = [
  "code",
  "name",
  "unit",
  "unitPrice",
  "quantity",
  "category",
];

/**
 * Editor de mapeo columna-archivo → campo NEXUS.
 * Solo re-deriva filas en modo plano (bloques ya fueron parseados).
 */
export default function MappingEditor({
  mapping,
  columns,
  blockMode,
  onChange,
}: {
  mapping: ColumnMapping[];
  columns: { index: number; header: string }[];
  blockMode: boolean;
  onChange: (mapping: ColumnMapping[]) => void;
}) {
  if (blockMode) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Columns3 aria-hidden="true" className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">Estructura APU detectada</p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          El archivo tiene formato de pack APU (secciones MATERIALES / EQUIPO /
          MANO DE OBRA). Las columnas de la tabla de líneas ya se detectaron
          automáticamente; el editor de mapeo manual aplica a archivos planos.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {mapping.map((m) => (
            <span
              key={m.targetField}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
            >
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-emerald-500" />
              {TARGET_LABELS[m.targetField]} ← “{m.sourceHeader}”
            </span>
          ))}
        </div>
      </article>
    );
  }

  function updateField(field: ImportTargetField, columnIndex: number) {
    const next = mapping.filter((m) => m.targetField !== field || columnIndex === m.sourceColumn);
    if (columnIndex < 0) {
      onChange(next.filter((m) => m.targetField !== field));
      return;
    }
    // Una columna no puede mapear dos campos: la liberamos del otro target.
    const freed = next.map((m) =>
      m.sourceColumn === columnIndex && m.targetField !== field
        ? { ...m, sourceColumn: (columns.find((c) => c.index !== columnIndex)?.index ?? 0), sourceHeader: columns.find((c) => c.index !== columnIndex)?.header ?? "", confidence: 50, needsAttention: true }
        : m,
    );
    const existing = freed.find((m) => m.targetField === field);
    const header = columns.find((c) => c.index === columnIndex)?.header ?? "";
    const entry: ColumnMapping = {
      sourceColumn: columnIndex,
      sourceHeader: header,
      targetField: field,
      confidence: 100,
      needsAttention: false,
    };
    const updated = existing
      ? freed.map((m) => (m.targetField === field ? entry : m))
      : [...freed, entry];
    onChange(updated);
  }

  const ordered = EDITABLE_TARGETS.filter((field) =>
    mapping.some((m) => m.targetField === field),
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Columns3 aria-hidden="true" className="h-4 w-4 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">Mapeo de columnas</p>
        <p className="text-xs text-slate-400">— ajusta si alguna columna quedó mal asignada</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((field) => {
          const entry = mapping.find((m) => m.targetField === field);
          if (!entry) return null;
          return (
            <label key={field} className="block rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
              <span className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                {TARGET_LABELS[field]}
                {entry.needsAttention && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                    difusa
                  </span>
                )}
              </span>
              <select
                value={entry.sourceColumn}
                onChange={(event) => updateField(field, Number(event.target.value))}
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-amber-400 focus:outline-none"
                aria-label={`Columna para ${TARGET_LABELS[field]}`}
              >
                <option value="-1">— Sin mapear —</option>
                {columns.map((column) => (
                  <option key={column.index} value={column.index}>
                    {column.index + 1}. {column.header || `Columna ${column.index + 1}`}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-right text-[10px] text-slate-400">
                confianza {entry.confidence}
              </span>
            </label>
          );
        })}
      </div>
    </article>
  );
}