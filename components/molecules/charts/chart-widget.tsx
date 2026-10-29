"use client";

import { IncomeChart } from "@/components/organisms/income-chart";
import { entryOf, type ChartData, type ChartType } from "@/lib/dashboard/chart-catalog";
import { DonutChart } from "./donut-chart";
import { GaugeChart } from "./gauge-chart";
import { SeriesChart } from "./series-chart";
import { useBox } from "./use-box";

const cop = (n: number) => `${n < 0 ? "−" : ""}$ ${Math.round(Math.abs(n)).toLocaleString("es-CO")}`;
const count = (n: number) => Math.round(n).toLocaleString("es-CO");

/**
 * Bloque de gráfico del inicio: tarjeta con título que rellena el alto que la
 * persona le dio (esquinas) y dibuja el tipo elegido con los datos del periodo.
 */
export function ChartWidget({ type, data, subtitle }: { type: ChartType; data: ChartData; subtitle?: string }) {
  const entry = entryOf(type);
  const [bodyRef, { h }] = useBox<HTMLDivElement>();
  const labels = data.points.map((p) => p.label);
  const fulls = data.points.map((p) => p.full);
  const empty = type === "customers" ? data.customers.length < 2 : type !== "donut" && type !== "gauge" && data.points.length < 2;

  let body: React.ReactNode = null;
  if (empty) {
    body = <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">Aún no hay datos para este gráfico.</p>;
  } else if (type === "bars") {
    body = <IncomeChart data={data.points} height={Math.max(120, h - 8)} />;
  } else if (type === "line") {
    body = (
      <SeriesChart
        labels={labels}
        fulls={fulls}
        format={cop}
        ariaLabel="Líneas de ingresos y gastos"
        series={[
          { name: "Ingresos", values: data.points.map((p) => p.income), tone: "ink" },
          { name: "Gastos", values: data.points.map((p) => p.expenses), tone: "soft" },
        ]}
      />
    );
  } else if (type === "area") {
    const running = data.points.map((_, i) => data.points.slice(0, i + 1).reduce((sum, p) => sum + p.income - p.expenses, 0));
    body = <SeriesChart area labels={labels} fulls={fulls} format={cop} ariaLabel="Balance acumulado" series={[{ name: "Balance", values: running, tone: "gold" }]} />;
  } else if (type === "donut") {
    body = <DonutChart parts={data.methods} ariaLabel="Ingresos por método de pago" />;
  } else if (type === "gauge") {
    body = <GaugeChart value={data.balance} of={data.income} ariaLabel="Balance sobre ingresos" />;
  } else {
    const idx = data.customers.map((_, i) => String(i + 1));
    body = <SeriesChart area labels={idx} fulls={idx.map((i) => `Punto ${i}`)} format={count} ariaLabel="Clientes activos" series={[{ name: "Clientes activos", values: data.customers, tone: "ink" }]} />;
  }

  return (
    <section className="flex h-full min-h-[200px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <header className="border-b border-border px-[18px] py-3">
        <h2 className="font-display text-[15px] font-semibold">{entry.label}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </header>
      <div ref={bodyRef} className="min-h-0 flex-1 px-[18px] py-3">
        {body}
      </div>
    </section>
  );
}
