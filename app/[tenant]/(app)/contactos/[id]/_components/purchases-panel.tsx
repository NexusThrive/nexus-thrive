import Link from "next/link";
import { Package, Repeat, Undo2 } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { EmptyState } from "@/components/molecules/empty-state";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/foundation/format";
import type { CustomerPurchases } from "@/lib/business/customers/purchases-db";

const date = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" }) : "");

/** Productos que compra esta persona: cuánto, cuántas veces, cada cuánto vuelve y lo que devolvió. */
export default function PurchasesPanel({ purchases, saleHref }: { purchases: CustomerPurchases; saleHref?: string | null }) {
  if (purchases.products.length === 0) {
    return (
      <EmptyState
        remember={false}
        mark="center"
        title="Aún no ha comprado"
        description="Cuando compre en el punto de venta o en un pedido, aquí verás qué productos lleva, cada cuánto vuelve y qué ofrecerle."
        icon={<Package />}
        action={saleHref ? <Link href={saleHref} className={cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6")}>Crear primera venta</Link> : undefined}
      />
    );
  }
  const stats: { label: string; value: string }[] = [
    { label: "Compras", value: String(purchases.orders) },
    { label: "Ha gastado", value: formatCurrency(purchases.spent) },
    { label: "Primera compra", value: date(purchases.firstDate) },
    { label: "Última compra", value: date(purchases.lastDate) },
  ];
  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="grid gap-1 rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="text-ui font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {purchases.averageGapDays !== null && purchases.nextExpected ? (
        <p className="flex items-start gap-2 rounded-lg bg-accent-subtle px-3 py-2.5 text-ui text-accent-text">
          <Repeat aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>Suele volver cada <b>{purchases.averageGapDays} días</b>. La próxima compra se espera hacia el <b>{date(purchases.nextExpected)}</b>.</span>
        </p>
      ) : null}
      <table className="w-full text-left text-ui">
        <caption className="sr-only">Productos que ha comprado</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="py-2 pe-3 font-medium">Producto</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Unidades</th>
            <th scope="col" className="px-3 py-2 text-right font-medium max-sm:hidden">Veces</th>
            <th scope="col" className="py-2 ps-3 text-right font-medium">Gastado</th>
          </tr>
        </thead>
        <tbody>
          {purchases.products.map((p) => (
            <tr key={p.key} className="border-b border-border/60 last:border-b-0">
              <td className="max-w-0 truncate py-2.5 pe-3 font-medium">{p.name}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{p.units}</td>
              <td className="px-3 py-2.5 text-right tabular-nums max-sm:hidden">{p.times}</td>
              <td className="py-2.5 ps-3 text-right tabular-nums">{formatCurrency(p.spent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {purchases.returns.count > 0 ? (
        <p className="flex items-center gap-2 text-ui text-muted-foreground">
          <Undo2 aria-hidden="true" className="size-4" />
          {purchases.returns.count} {purchases.returns.count === 1 ? "devolución" : "devoluciones"} por {formatCurrency(purchases.returns.total)}.
        </p>
      ) : null}
    </div>
  );
}
