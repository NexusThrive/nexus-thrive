import { StatTile } from "@/components/molecules/stat-tile";
import { PrintButton } from "@/components/molecules/print-button";
import type { VisitorReport } from "@/lib/business/museum";
import { formatCurrency } from "@/lib/format";

const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { ...opts, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

function Breakdown({ title, rows }: { title: string; rows: { label: string; value: number; extra?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="grid content-start gap-2 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length ? (
        <ul className="grid gap-2.5">
          {rows.map((r) => (
            <li key={r.label} className="grid gap-1">
              <span className="flex justify-between gap-2 text-[13px]">
                <span className="truncate">{r.label}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {r.value.toLocaleString("es-CO")}
                  {r.extra ? ` · ${r.extra}` : ""}
                </span>
              </span>
              <span aria-hidden="true" className="h-1.5 rounded-full bg-border">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(r.value / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted-foreground">Sin datos.</p>
      )}
    </section>
  );
}

/** Informe de visitantes del periodo: totales, visitantes por día, por tipo de entrada, modalidad y franja. */
export default function VisitorReportView({ report, from, to }: { report: VisitorReport; from: string; to: string }) {
  const max = Math.max(1, ...report.byDay.map((d) => d.visitors));
  const avg = report.byDay.length ? report.visitors / report.byDay.length : 0;
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Del {dayLabel(from, { day: "numeric", month: "long" })} al {dayLabel(to, { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <PrintButton label="Imprimir informe" />
      </div>

      <section aria-label="Totales" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile index={0} label="Visitantes" value={report.visitors} tone="success" note={`${report.sales} ventas y reservas`} />
        <StatTile index={1} label="Promedio diario" value={Math.round(avg)} tone="neutral" note="Visitantes por día" />
        <StatTile index={2} label="Recaudo" value={formatCurrency(report.revenue)} tone="neutral" note="Entradas cobradas" />
        <StatTile index={3} label="Día con más visitas" value={report.busiestDay ? dayLabel(report.busiestDay, { day: "numeric", month: "short" }) : "—"} tone="muted" note={report.busiestDay ? `${report.byDay.find((d) => d.day === report.busiestDay)?.visitors} visitantes` : "Sin visitas"} />
      </section>

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Visitantes por día</h3>
        <div role="img" aria-label={`Visitantes por día: total ${report.visitors}, máximo ${max} en un día`} className="flex h-40 items-end gap-[2px] border-b border-border">
          {report.byDay.map((d) => (
            <div key={d.day} className="group relative flex h-full min-w-0 flex-1 items-end">
              <div className="w-full rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80" style={{ height: d.visitors ? `${Math.max(2, (d.visitors / max) * 100)}%` : 0 }} />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-foreground shadow-sm group-hover:block">
                {dayLabel(d.day, { weekday: "short", day: "numeric", month: "short" })}: <b className="font-mono">{d.visitors}</b>
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{dayLabel(from, { day: "numeric", month: "short" })}</span>
          <span>{dayLabel(to, { day: "numeric", month: "short" })}</span>
        </div>
        <details className="text-[13px]">
          <summary className="cursor-pointer text-muted-foreground">Ver como tabla</summary>
          <table className="mt-2 w-full">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Día</th>
                <th className="py-1 text-right font-medium">Visitantes</th>
                <th className="py-1 text-right font-medium">Recaudo</th>
              </tr>
            </thead>
            <tbody>
              {report.byDay.map((d) => (
                <tr key={d.day} className="border-t border-border">
                  <td className="py-1">{dayLabel(d.day, { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td className="py-1 text-right font-mono tabular-nums">{d.visitors}</td>
                  <td className="py-1 text-right font-mono tabular-nums">{formatCurrency(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Breakdown title="Por tipo de entrada" rows={report.byType.map((t) => ({ label: t.name, value: t.visitors, extra: formatCurrency(t.revenue) }))} />
        <Breakdown title="Por modalidad" rows={report.byKind.map((k) => ({ label: k.label, value: k.visitors }))} />
        <Breakdown title="Por franja" rows={report.bySlot.map((s) => ({ label: s.slot, value: s.visitors }))} />
      </div>
    </div>
  );
}
