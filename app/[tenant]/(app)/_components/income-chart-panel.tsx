"use client";

import { useRef, useState } from "react";
import { DayMovementsSheet, type MovementsState } from "@/components/organisms/day-movements-sheet";
import { IncomeChart, type ChartPoint } from "@/components/organisms/income-chart";
import { loadMovementsAction } from "../_actions/movements";

/**
 * Gráfica de ingresos y gastos del inicio con su detalle: un clic (o Enter) en
 * una barra con movimientos abre la hoja con las transacciones de ese día,
 * semana o mes. Si se toca otra barra mientras llega la respuesta, solo vale la última.
 */
export function IncomeChartPanel({ tenantSlug, data, label }: { tenantSlug: string; data: ChartPoint[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [state, setState] = useState<MovementsState>({ status: "loading" });
  const latest = useRef(0);

  async function show(point: ChartPoint) {
    if (!point.from || !point.to) return;
    const id = ++latest.current;
    setTitle(point.full);
    setState({ status: "loading" });
    setOpen(true);
    const result = await loadMovementsAction(tenantSlug, point.from, point.to).catch(() => null);
    if (id !== latest.current) return;
    if (!result || !result.ok) {
      setState({ status: "error", message: result?.message ?? "Intenta de nuevo en un momento." });
      return;
    }
    setState({
      status: "ok",
      truncated: result.truncated,
      rows: result.rows.map((row) => ({ id: row.id, type: row.type, title: row.title, subtitle: row.subtitle, amount: row.amount, at: row.at })),
    });
  }

  return (
    <>
      <IncomeChart data={data} label={label} onSelect={show} />
      <DayMovementsSheet open={open} onOpenChange={setOpen} title={title} state={state} fullHref={`/${tenantSlug}/finance`} />
    </>
  );
}
