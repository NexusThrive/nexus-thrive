import { Landmark, MinusCircle, Scale, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/molecules/kpi-card";
import { formatCurrency } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/finance";
import type { FinanceMetrics } from "@/lib/tenant-db";

/**
 * Resumen del mes (Server Component). Cada métrica es real: agregados sobre
 * pagos aprobados y gastos del período en curso (horario Bogotá). Cifras en
 * tinta; el punto rojo solo aparece si el balance es negativo.
 */
export default function FinanceSummary({ income, expenses, balance, byMethod }: FinanceMetrics) {
  return (
    <section aria-label="Resumen financiero del mes" className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
      <KpiCard index={0} label="Ingresos del mes" value={income} format="cop" icon={TrendingUp} hint="Pagos con estado Pagado" />
      <KpiCard index={1} label="Gastos del mes" value={expenses} format="cop" icon={MinusCircle} hint="Egresos de caja menor" />
      <KpiCard
        index={2}
        label="Balance del mes"
        value={balance}
        format="cop"
        icon={Scale}
        alert={balance < 0}
        hint="Ingresos menos gastos del período"
      />
      <KpiCard index={3} label="Por método" value={income} format="cop" icon={Landmark}>
        <ul className="space-y-1">
          {byMethod.map(({ method, total }) => (
            <li key={method} className="flex items-center justify-between gap-2">
              <span className="truncate">{paymentMethodLabel(method)}</span>
              <span className="shrink-0 font-medium tabular-nums text-foreground">{formatCurrency(total)}</span>
            </li>
          ))}
        </ul>
      </KpiCard>
    </section>
  );
}
