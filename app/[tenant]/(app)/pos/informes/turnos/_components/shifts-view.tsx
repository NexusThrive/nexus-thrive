import Link from "next/link";
import { Clock, Store } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { EmptyState } from "@/components/molecules/empty-state";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { formatCurrency } from "@/lib/foundation/format";
import { SHIFT_LABELS, shiftStatus, summarizeShifts, type ShiftRow } from "@/lib/business/pos/shift-report";

const TONE = { open: "warning", balanced: "success", over: "warning", short: "danger" } as const;
const when = (iso: string) => new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

/** Turnos de caja del mostrador con su cuadre. */
export default function ShiftsView({ slug, rows }: { slug: string; rows: ShiftRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        mark="page"
        headingLevel={2}
        title="Aún no hay turnos"
        description="Cuando abras un turno en el punto de venta y lo cierres, aquí verás cómo cuadró la caja."
        icon={<Clock />}
        preview={{ columns: ["Turno", "Esperado", "Contado", "Diferencia"], rows: [["Mostrador 1 · Ana", "$ 420.000", "$ 420.000", "Cuadrado"], ["Mostrador 1 · Luis", "$ 310.000", "$ 308.500", "Falta $ 1.500"]] }}
        action={<Link href={`/${slug}/pos`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-ui font-medium text-accent-foreground hover:bg-accent-hover"><Store aria-hidden="true" className="size-4" />Ir al punto de venta</Link>}
      />
    );
  }
  const s = summarizeShifts(rows);
  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          { label: "Turnos", value: String(s.total) },
          { label: "Cuadraron", value: `${s.balanced} de ${s.total - s.open}` },
          { label: "Sobró", value: formatCurrency(s.over) },
          { label: "Faltó", value: formatCurrency(s.short) },
        ].map((k) => (
          <div key={k.label} className="grid gap-1 rounded-xl border border-border bg-surface p-3.5">
            <dt className="text-xs text-muted-foreground">{k.label}</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{k.value}</dd>
          </div>
        ))}
      </dl>
      <AdaptiveTable<ShiftRow>
        caption="Turnos de caja del mostrador"
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: "shift", header: "Turno", role: "primary", cell: (r) => <span className="font-medium">{r.terminalName} · {r.cashier}</span> },
          { key: "when", header: "Abierto", role: "secondary", cell: (r) => <span className="text-muted-foreground">{when(r.openedAt)}{r.closedAt ? ` → ${when(r.closedAt)}` : ""}</span> },
          { key: "opening", header: "Apertura", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.opening)}</span> },
          { key: "expected", header: "Esperado", role: "detail", align: "right", cell: (r) => (r.expected == null ? "" : <span className="font-mono tabular-nums">{formatCurrency(r.expected)}</span>) },
          { key: "counted", header: "Contado", role: "detail", align: "right", cell: (r) => (r.counted == null ? "" : <span className="font-mono tabular-nums">{formatCurrency(r.counted)}</span>) },
          { key: "diff", header: "Cuadre", role: "status", cell: (r) => { const st = shiftStatus(r); return <Badge tone={TONE[st]}>{SHIFT_LABELS[st]}{st === "over" || st === "short" ? ` ${formatCurrency(Math.abs(r.difference ?? 0))}` : ""}</Badge>; } },
        ]}
      />
    </div>
  );
}
