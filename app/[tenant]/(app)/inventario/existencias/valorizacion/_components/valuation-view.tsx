import Link from "next/link";
import { Boxes, Coins, Package } from "lucide-react";
import { EmptyState } from "@/components/molecules/empty-state";
import { formatCurrency } from "@/lib/foundation/format";
import type { Valuation } from "@/lib/business/inventory/valuation";

/** Valorización del inventario: total, categorías con su participación y los productos que más valen. */
export default function ValuationView({ slug, valuation }: { slug: string; valuation: Valuation }) {
  if (valuation.products === 0) {
    return (
      <EmptyState
        mark="page"
        headingLevel={2}
        title="Aún no hay inventario que valorar"
        description="Cuando registres existencias de tus productos, aquí verás cuánto vale cada categoría y qué producto concentra más dinero."
        icon={<Coins />}
        preview={{ columns: ["Categoría", "Unidades", "Valor"], rows: [["Suplementos", "86", "$ 4.200.000"], ["Accesorios", "40", "$ 520.000"]] }}
        action={<Link href={`/${slug}/inventario/existencias`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-ui font-medium text-accent-foreground hover:bg-accent-hover"><Boxes aria-hidden="true" className="size-4" />Ir a existencias</Link>}
      />
    );
  }
  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-3 gap-2.5">
        {[
          { icon: <Coins />, label: "Valor del inventario", value: formatCurrency(valuation.total) },
          { icon: <Boxes />, label: "Unidades", value: String(valuation.units) },
          { icon: <Package />, label: "Productos", value: String(valuation.products) },
        ].map((k) => (
          <div key={k.label} className="grid gap-1 rounded-xl border border-border bg-surface p-3.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground [&>svg]:size-3.5">{k.icon}{k.label}</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums max-sm:text-base">{k.value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="val-categorias" className="grid gap-2 rounded-xl border border-border bg-surface p-4">
          <h2 id="val-categorias" className="font-display text-base font-semibold">Por categoría</h2>
          <ul className="grid gap-2.5 text-ui">
            {valuation.byCategory.map((c) => (
              <li key={c.category} className="grid gap-1">
                <span className="flex items-center justify-between gap-3"><span className="min-w-0 truncate">{c.category} <span className="text-muted-foreground">· {c.units} u.</span></span><b className="font-mono tabular-nums">{formatCurrency(c.value)}</b></span>
                <span className="h-1.5 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`${c.share} % del valor`}><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(2, c.share)}%` }} /></span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="val-productos" className="grid gap-2 rounded-xl border border-border bg-surface p-4">
          <h2 id="val-productos" className="font-display text-base font-semibold">Lo que más vale</h2>
          <table className="w-full text-left text-ui">
            <caption className="sr-only">Productos que concentran más valor</caption>
            <thead><tr className="border-b border-border text-xs text-muted-foreground"><th scope="col" className="py-2 pe-3 font-medium">Producto</th><th scope="col" className="px-3 py-2 text-right font-medium">Unidades</th><th scope="col" className="py-2 ps-3 text-right font-medium">Valor</th></tr></thead>
            <tbody>
              {valuation.top.map((p) => (
                <tr key={p.productId} className="border-b border-border/60 last:border-b-0"><td className="max-w-0 truncate py-2 pe-3 font-medium">{p.name}</td><td className="px-3 py-2 text-right tabular-nums">{p.units}</td><td className="py-2 ps-3 text-right tabular-nums">{formatCurrency(p.value)} <span className="text-xs text-muted-foreground">{p.share} %</span></td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
