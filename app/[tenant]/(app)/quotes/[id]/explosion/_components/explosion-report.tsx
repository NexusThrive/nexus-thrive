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
    header: "border-accent/30 bg-accent-subtle text-accent-text",
    badge: "bg-accent-subtle text-accent-text",
    iconBox: "bg-accent-subtle text-accent-text",
  },
  labor: {
    header: "border-gold-300 bg-gold-100 text-gold-700",
    badge: "bg-gold-100 text-gold-700",
    iconBox: "bg-gold-100 text-gold-700",
  },
  equipment: {
    header: "border-graphite-200 bg-graphite-100 text-graphite-700",
    badge: "bg-graphite-100 text-graphite-700",
    iconBox: "bg-graphite-100 text-graphite-700",
  },
  transport: {
    header: "border-graphite-200 bg-graphite-100 text-graphite-500",
    badge: "bg-graphite-100 text-graphite-500",
    iconBox: "bg-graphite-100 text-graphite-500",
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
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar insumo (código o nombre)…"
            aria-label="Buscar insumo"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-gold-600/20"
          />
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(sections, quote.code)}
          disabled={totalRows === 0}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 text-sm font-medium text-success transition hover:border-success/40 hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="overflow-hidden rounded-lg border border-border bg-card shadow-xs"
          >
            <header
              className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${tone.header}`}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{section.title}</h2>
                <span className="rounded-full bg-card/70 px-2 py-0.5 text-xs font-medium">
                  {section.rows.length}{" "}
                  {section.rows.length === 1 ? "recurso" : "recursos"}
                </span>
              </div>
              <p className="text-sm font-medium">{formatCurrency(total)}</p>
            </header>

            {section.rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {query
                  ? "Sin resultados para esa búsqueda."
                  : "No hay recursos en esta categoría."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
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
                  <tbody className="divide-y divide-border">
                    {section.rows.map((row) => (
                      <tr
                        key={`${section.key}:${row.itemId ?? row.name}:${row.code ?? ""}`}
                        className="transition hover:bg-muted/60"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          {row.code ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {row.name}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{row.unit}</td>
                        <td className="px-4 py-2.5 text-right text-foreground">
                          {row.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {formatCurrency(row.unitPrice)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-foreground">
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