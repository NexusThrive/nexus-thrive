"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { apuCategoryLabel } from "@/lib/apu-engine";
import { formatCurrency } from "@/lib/format";
import type { ExplosionResource, ExplosionTotals } from "@/lib/apu-explosion";

type ExplosionSection = {
  key: "materials" | "labor" | "equipment" | "transport";
  title: string;
  resourceLabel: string;
  rows: ExplosionResource[];
};

const SECTION_TONES: Record<
  ExplosionSection["key"],
  { header: string; badge: string; iconBox: string }
> = {
  materials: {
    header: "border-indigo-200 bg-indigo-50 text-indigo-700",
    badge: "bg-indigo-50 text-indigo-600",
    iconBox: "bg-indigo-50 text-indigo-600",
  },
  labor: {
    header: "border-amber-200 bg-amber-50 text-amber-700",
    badge: "bg-amber-50 text-amber-600",
    iconBox: "bg-amber-50 text-amber-600",
  },
  equipment: {
    header: "border-violet-200 bg-violet-50 text-violet-700",
    badge: "bg-violet-50 text-violet-600",
    iconBox: "bg-violet-50 text-violet-600",
  },
  transport: {
    header: "border-cyan-200 bg-cyan-50 text-cyan-700",
    badge: "bg-cyan-50 text-cyan-600",
    iconBox: "bg-cyan-50 text-cyan-600",
  },
};

function matchesQuery(row: ExplosionResource, query: string): boolean {
  if (!query) {
    return true;
  }
  const needle = query.trim().toLowerCase();
  const code = (row.code ?? "").toLowerCase();
  const name = row.name.toLowerCase();
  return code.includes(needle) || name.includes(needle);
}

/** Genera y descarga el CSV de lista de compras con los datos REALES. */
function downloadCsv(
  sections: ExplosionSection[],
  quoteCode: string,
): void {
  const header = [
    "Código",
    "Insumo",
    "Categoría",
    "Unidad",
    "Cantidad",
    "Precio Unitario",
    "Costo Estimado",
  ];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [header.join(";")];
  for (const section of sections) {
    for (const row of section.rows) {
      lines.push(
        [
          row.code ?? "",
          row.name,
          apuCategoryLabel(row.category),
          row.unit,
          row.quantity,
          row.unitPrice,
          row.estimatedCost,
        ]
          .map(escape)
          .join(";"),
      );
    }
  }
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `explosion-${quoteCode}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Reporte operativo de explosión de insumos (panel de obra).
 * Client Component: búsqueda en vivo + exportación de compras; los datos
 * vienen ya serializados del Server Component.
 */
export default function ExplosionReport({
  quote,
  sections,
  totals,
}: {
  quote: { code: string; title: string };
  sections: ExplosionSection[];
  totals: ExplosionTotals;
}) {
  const [query, setQuery] = useState("");

  const totalRows = sections.reduce((sum, section) => sum + section.rows.length, 0);

  const filteredSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        rows: section.rows.filter((row) => matchesQuery(row, query)),
      })),
    [sections, query],
  );

  return (
    <div className="space-y-6">
      {/* Barra de herramientas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar insumo (código o nombre)…"
            aria-label="Buscar insumo"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(sections, quote.code)}
          disabled={totalRows === 0}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Exportar Lista de Compras
        </button>
      </div>

      {/* Secciones por categoría */}
      {filteredSections.map((section) => {
        const tone = SECTION_TONES[section.key];
        const total = sectionKeyTotal(section.key, totals);
        return (
          <section
            key={section.key}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <header
              className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${tone.header}`}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{section.title}</h2>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">
                  {section.rows.length}{" "}
                  {section.rows.length === 1 ? "recurso" : "recursos"}
                </span>
              </div>
              <p className="text-sm font-medium">{formatCurrency(total)}</p>
            </header>

            {section.rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                {query
                  ? "Sin resultados para esa búsqueda."
                  : "No hay recursos en esta categoría."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Código</th>
                      <th className="px-4 py-3 font-medium">
                        {section.resourceLabel}
                      </th>
                      <th className="px-4 py-3 font-medium">Unidad</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Cantidad Total
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Precio Unitario
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Costo Estimado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {section.rows.map((row) => (
                      <tr
                        key={`${section.key}:${row.itemId ?? row.name}:${row.code ?? ""}`}
                        className="transition hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                          {row.code ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {row.name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{row.unit}</td>
                        <td className="px-4 py-2.5 text-right text-slate-900">
                          {row.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">
                          {formatCurrency(row.unitPrice)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                          {formatCurrency(row.estimatedCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function sectionKeyTotal(
  key: ExplosionSection["key"],
  totals: ExplosionTotals,
): string {
  switch (key) {
    case "materials":
      return totals.materials;
    case "labor":
      return totals.labor;
    case "equipment":
      return totals.equipment;
    case "transport":
      return totals.transport;
  }
}