import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DonutChart } from "@/components/widgets/charts/donut-chart";
import { DeltaPill, HatchBars, LineArea, Widget, WidgetHead, WidgetValue, widgetRow } from "@/components/widgets/widget";
import { MovementsList, type Movement } from "@/components/organisms/movements-list";
import { percentChange } from "@/lib/experience/dashboard";
import { formatCurrency } from "@/lib/foundation/format";
import { paymentMethodLabel, type PaymentMethodValue } from "@/lib/foundation/kernel/payment-vocabulary";
import { cn } from "@/lib/utils";

type Totals = { income: number; expenses: number; balance: number; count: number };
type Series = { days: { day: string; income: number; expenses: number }[]; current: Totals; previous: Totals };

const dayFmt = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "short" });
const atNoon = (day: string) => new Date(`${day}T12:00:00-05:00`);
const compact = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1 });

/**
 * Resumen de Finanzas como tablero: arriba, siempre, las tres cifras frente al periodo anterior; debajo, el balance del periodo en la tarjeta
 * de oro con su curva de ingresos y, a su lado, lo gastado y la caja menor; y abajo los movimientos por día junto a lo cobrado en la semana y por medio de
 * pago. Todo con datos reales del servidor; sin movimiento decorativo.
 */
export default function FinanceOverview({
  slug,
  periodLabel,
  series,
  byMethod,
  monthLabel,
  movements,
  cash,
}: {
  slug: string;
  periodLabel: string;
  series: Series;
  byMethod: { method: PaymentMethodValue; total: number }[];
  monthLabel: string;
  movements: Movement[];
  /** Caja menor real: nombre, efectivo esperado con turno abierto, o `null` si está cerrada o no existe. */
  cash: { box: string | null; amount: number | null };
}) {
  const { current, previous, days } = series;
  const income = days.map((d) => d.income);
  const share = current.income > 0 ? Math.min(1, current.expenses / current.income) : current.expenses > 0 ? 1 : 0;
  const week = days.slice(-7);
  const weekTotal = week.reduce((sum, d) => sum + d.income, 0);
  const cajaHref = `/${slug}/finanzas/caja`;
  const kpis: { label: string; value: string; delta: number | null; inverse?: boolean }[] = [
    { label: "Ingresos", value: formatCurrency(current.income), delta: percentChange(current.income, previous.income) },
    { label: "Gastos", value: formatCurrency(current.expenses), delta: percentChange(current.expenses, previous.expenses), inverse: true },
    { label: "Movimientos", value: String(current.count), delta: percentChange(current.count, previous.count) },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((k) => (
          <Widget key={k.label} className="gap-3 p-5">
            <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
            <WidgetValue>{k.value}</WidgetValue>
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <DeltaPill value={k.delta} inverse={k.inverse} />
              {k.delta == null ? "Sin periodo anterior" : "frente al periodo anterior"}
            </p>
          </Widget>
        ))}
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Widget variant="accent" aria-labelledby="fin-balance" className="grid-rows-[auto_auto_minmax(0,1fr)_auto] p-6">
          <WidgetHead id="fin-balance" title="Balance" subtitle={periodLabel} href={`/${slug}/finanzas/cobros`} actionLabel="Ver los cobros" onAccent />
          <div className="grid gap-1">
            <WidgetValue className="text-4xl">{formatCurrency(current.balance)}</WidgetValue>
            <p className="text-xs text-ink/70">
              {percentChange(current.balance, previous.balance) == null ? "Sin periodo anterior para comparar" : `${percentChange(current.balance, previous.balance)! > 0 ? "↗ +" : "↘ −"}${Math.abs(percentChange(current.balance, previous.balance)!)} % frente al periodo anterior`}
            </p>
          </div>
          {days.length > 1 ? <LineArea values={income} labels={[dayFmt.format(atNoon(days[0]!.day)).replace(".", ""), dayFmt.format(atNoon(days.at(-1)!.day)).replace(".", "")]} format={(n) => compact.format(n)} ariaLabel={`Ingresos por día, ${periodLabel}`} /> : <span />}
          <dl className="grid grid-cols-2 gap-3">
            <div className="grid gap-0.5 rounded-2xl bg-ink/10 px-4 py-3">
              <dt className="text-xs text-ink/70">Ingresos</dt>
              <dd className="text-ui font-semibold tabular-nums">{formatCurrency(current.income)}</dd>
            </div>
            <div className="grid gap-0.5 rounded-2xl bg-ink/10 px-4 py-3">
              <dt className="text-xs text-ink/70">Gastos</dt>
              <dd className="text-ui font-semibold tabular-nums">{formatCurrency(current.expenses)}</dd>
            </div>
          </dl>
        </Widget>

        <div className="grid content-stretch gap-4">
          <Widget aria-labelledby="fin-gastos" className="content-between p-6">
            <WidgetHead
              id="fin-gastos"
              title="Gastos del periodo"
              subtitle={periodLabel}
              right={<span className={cn("rounded-full px-3 py-1 text-xs font-medium", share > 0.8 ? "bg-warning/15 text-warning-foreground" : "bg-success/15 text-success")}>{share > 0.8 ? "Revisar" : "Al día"}</span>}
            />
            <WidgetValue>{formatCurrency(current.expenses)}</WidgetValue>
            <div className="grid gap-2">
              <span role="img" aria-label={`${Math.round(share * 100)} % de los ingresos se fue en gastos`} className="block h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(share * 100)}%` }} />
              </span>
              <p className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span>{Math.round(share * 100)} % de los ingresos</span>
                <span className="tabular-nums">Ingresos {formatCurrency(current.income)}</span>
              </p>
            </div>
          </Widget>

          <Widget aria-labelledby="fin-caja" className="content-between p-6">
            <WidgetHead id="fin-caja" title={cash.box ?? "Caja menor"} subtitle={cash.amount != null ? "Turno abierto · efectivo esperado" : cash.box ? "Cerrada · ábrela para empezar el día" : "Aún no la has creado"} />
            {cash.amount != null ? <WidgetValue>{formatCurrency(cash.amount)}</WidgetValue> : null}
            <Link href={cajaHref} className="inline-flex h-11 items-center justify-center rounded-full bg-surface-muted px-5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {cash.amount != null ? "Ver los movimientos de la caja" : cash.box ? "Abrir la caja" : "Crear la caja menor"}
            </Link>
          </Widget>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <MovementsList items={movements} />
        <div className="grid gap-4">
          <Widget aria-labelledby="fin-semana" className="p-6">
            <WidgetHead id="fin-semana" title="Cobrado en la semana" subtitle="Parte del mejor día" />
            <WidgetValue>{formatCurrency(weekTotal)}</WidgetValue>
            {week.length ? (
              <HatchBars
                values={week.map((d) => d.income)}
                labels={week.map((d) => weekdayFmt.format(atNoon(d.day)).replace(".", ""))}
                format={formatCurrency}
                ariaLabel="Ingresos de los últimos 7 días"
                height={150}
              />
            ) : (
              <p className={cn(widgetRow, "text-ui text-muted-foreground")}>Aún no hay cobros esta semana.</p>
            )}
          </Widget>
          <Widget aria-labelledby="fin-medios" className="p-6">
            <WidgetHead
              id="fin-medios"
              title="Cobros por medio"
              subtitle={`Mes de ${monthLabel}`}
              right={
                <Link href={`/${slug}/finanzas/cobros`} aria-label="Ver los cobros" className="grid size-9 place-items-center rounded-full bg-surface-muted transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </Link>
              }
            />
            <div className="h-[220px]">
              <DonutChart parts={byMethod.map((m) => ({ label: paymentMethodLabel(m.method), total: m.total }))} ariaLabel="Cobros del mes por medio de pago" />
            </div>
          </Widget>
        </div>
      </div>
    </div>
  );
}
