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
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-500">
              Ingresos del mes
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-600 sm:text-3xl">
              {formatCurrency(income)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600"
          >
            <TrendingUp className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Pagos con estado <span className="font-medium">Pagado</span>
        </p>
      </article>

      {/* Gastos */}
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-500">
              Gastos del mes
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-rose-600 sm:text-3xl">
              {formatCurrency(expenses)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600"
          >
            <Receipt className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Egresos de caja menor
        </p>
      </article>

      {/* Balance */}
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-500">
              Balance del mes
            </p>
            <p
              className={cn(
                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl",
                balance > 0
                  ? "text-emerald-600"
                  : balance < 0
                    ? "text-rose-600"
                    : "text-slate-900",
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
                ? "bg-emerald-50 text-emerald-600"
                : balance < 0
                  ? "bg-rose-50 text-rose-600"
                  : "bg-slate-100 text-slate-600",
            )}
          >
            <Scale className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Ingresos menos gastos del período
        </p>
      </article>

      {/* Por método */}
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-500">
              Por método
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {formatCurrency(income)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600"
          >
            <Landmark className="h-5 w-5" />
          </span>
        </div>
        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
          {byMethod.map(({ method, total }) => (
            <li
              key={method}
              className="flex items-center justify-between gap-2 text-xs text-slate-600"
            >
              <span className="truncate">{paymentMethodLabel(method)}</span>
              <span className="shrink-0 font-medium text-slate-800">
                {formatCurrency(total)}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}