import { Landmark, Receipt, Scale, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/finance";
import type { FinanceMetrics } from "@/lib/tenant-db";

/**
 * Resumen del mes (Server Component). Cada métrica es real: agregados sobre
 * pagos aprobados y gastos del período en curso (horario Bogotá).
 */
export default function FinanceSummary({
  income,
  expenses,
  balance,
  byMethod,
}: FinanceMetrics) {
  return (
    <section
      aria-label="Resumen financiero del mes"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* Ingresos */}
      <article className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              Ingresos del mes
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-success sm:text-3xl">
              {formatCurrency(income)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-success/10 text-success"
          >
            <TrendingUp className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Pagos con estado <span className="font-medium">Pagado</span>
        </p>
      </article>

      {/* Gastos */}
      <article className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              Gastos del mes
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-destructive sm:text-3xl">
              {formatCurrency(expenses)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive"
          >
            <Receipt className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Egresos de caja menor
        </p>
      </article>

      {/* Balance */}
      <article className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              Balance del mes
            </p>
            <p
              className={cn(
                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl",
                balance > 0
                  ? "text-success"
                  : balance < 0
                    ? "text-destructive"
                    : "text-foreground",
              )}
            >
              {formatCurrency(balance)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
              balance > 0
                ? "bg-success/10 text-success"
                : balance < 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground",
            )}
          >
            <Scale className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Ingresos menos gastos del período
        </p>
      </article>

      {/* Por método */}
      <article className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              Por método
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {formatCurrency(income)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-text"
          >
            <Landmark className="h-5 w-5" />
          </span>
        </div>
        <ul className="mt-3 space-y-1 border-t border-border pt-3">
          {byMethod.map(({ method, total }) => (
            <li
              key={method}
              className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
            >
              <span className="truncate">{paymentMethodLabel(method)}</span>
              <span className="shrink-0 font-medium text-foreground/90">
                {formatCurrency(total)}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}