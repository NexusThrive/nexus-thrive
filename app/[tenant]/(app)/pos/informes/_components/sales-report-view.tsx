import Link from "next/link";
import { BarChart3, Receipt, Store, TrendingUp } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { EmptyState } from "@/components/molecules/empty-state";
import { formatCurrency } from "@/lib/foundation/format";
import { PERIODS } from "@/lib/business/pos/sales-report";
import type { SalesReportView as Report } from "@/lib/business/pos/sales-report-db";
import { cn } from "@/lib/utils";

const PREVIEW = { columns: ["Producto", "Unidades", "Vendido"], rows: [["Proteína whey 2 lb", "14", "$ 1.400.000"], ["Barra de proteína", "62", "$ 310.000"], ["Shaker", "9", "$ 180.000"]] };

/** Informe de ventas del punto de venta: periodo, cifras, productos más vendidos, ventas por persona y por medio de pago. */
export default function SalesReportView({ slug, report }: { slug: string; report: Report }) {
  const base = `/${slug}/pos/informes`;
  const money = formatCurrency;
  return (
    <div className="grid gap-4">
      <nav aria-label="Periodo" className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <Link key={p.value} href={`${base}?periodo=${p.value}`} aria-current={report.period === p.value ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-ui outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11 pointer-coarse:py-2.5", report.period === p.value ? "border-accent bg-accent-subtle font-medium text-accent-text" : "border-border-input text-foreground/80 hover:border-border-input-hover")}>
            {p.label}
          </Link>
        ))}
      </nav>
      {report.truncated ? <Alert tone="warning">Hay más de 2.000 ventas en este periodo: el informe cuenta las más recientes. Elige un periodo más corto.</Alert> : null}

      {report.count === 0 ? (
        <EmptyState
          mark="page"
          headingLevel={2}
          title="Sin ventas en este periodo"
          description="Cuando vendas en el punto de venta, aquí verás cuánto vendiste, qué se vende más y quién vendió."
          icon={<BarChart3 />}
          preview={PREVIEW}
          action={<Link href={`/${slug}/pos`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-ui font-medium text-accent-foreground hover:bg-accent-hover"><Store aria-hidden="true" className="size-4" />Ir al punto de venta</Link>}
          highlights={[
            { icon: <TrendingUp />, title: "Lo que más se vende", text: "Los productos que mueven tu negocio." },
            { icon: <Receipt />, title: "Cómo pagan", text: "Efectivo, Nequi, transferencia…" },
            { icon: <Store />, title: "Quién vendió", text: "Ventas por cajero." },
          ]}
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[
              { label: "Ventas", value: String(report.count) },
              { label: "Total vendido", value: money(report.total) },
              { label: "Ticket promedio", value: money(report.average) },
              { label: "Propinas", value: money(report.tips) },
            ].map((k) => (
              <div key={k.label} className="grid gap-1 rounded-xl border border-border bg-surface p-3.5">
                <dt className="text-xs text-muted-foreground">{k.label}</dt>
                <dd className="font-mono text-lg font-semibold tabular-nums">{k.value}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section aria-labelledby="top-productos" className="grid gap-2 rounded-xl border border-border bg-surface p-4">
              <h2 id="top-productos" className="font-display text-[15px] font-semibold">Lo que más se vende</h2>
              <table className="w-full text-left text-ui">
                <caption className="sr-only">Productos más vendidos del periodo</caption>
                <thead><tr className="border-b border-border text-xs text-muted-foreground"><th scope="col" className="py-2 pe-3 font-medium">Producto</th><th scope="col" className="px-3 py-2 text-right font-medium">Unidades</th><th scope="col" className="py-2 ps-3 text-right font-medium">Vendido</th></tr></thead>
                <tbody>
                  {report.topProducts.map((p) => (
                    <tr key={p.key} className="border-b border-border/60 last:border-b-0"><td className="max-w-0 truncate py-2 pe-3 font-medium">{p.name}</td><td className="px-3 py-2 text-right tabular-nums">{p.units}</td><td className="py-2 ps-3 text-right tabular-nums">{money(p.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
            <div className="grid content-start gap-4">
              <section aria-labelledby="por-cajero" className="grid gap-2 rounded-xl border border-border bg-surface p-4">
                <h2 id="por-cajero" className="font-display text-[15px] font-semibold">Quién vendió</h2>
                <ul className="grid gap-1.5 text-ui">
                  {report.byCashier.map((c) => (
                    <li key={c.cashierId ?? "sin"} className="flex items-center justify-between gap-3"><span className="min-w-0 truncate">{(c.cashierId && report.cashiers[c.cashierId]) || "Sin registrar"} <span className="text-muted-foreground">· {c.count} {c.count === 1 ? "venta" : "ventas"}</span></span><b className="font-mono tabular-nums">{money(c.total)}</b></li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="por-medio" className="grid gap-2 rounded-xl border border-border bg-surface p-4">
                <h2 id="por-medio" className="font-display text-[15px] font-semibold">Cómo pagaron</h2>
                <ul className="grid gap-1.5 text-ui">
                  {report.byMethod.map((m) => (
                    <li key={m.method} className="flex items-center justify-between gap-3"><span className="min-w-0 truncate">{m.method}</span><b className="font-mono tabular-nums">{money(m.total)}</b></li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
