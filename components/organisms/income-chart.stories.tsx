import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IncomeChart, type ChartPoint } from "./income-chart";

const week: ChartPoint[] = ["Vie", "Sáb", "Dom", "Lun", "Mar", "Mié", "Jue"].map((label, i) => ({
  label,
  full: `${label} ${10 + i} de oct.`,
  income: [420, 550, 300, 630, 480, 710, 780][i] * 1000,
  expenses: [90, 0, 0, 210, 60, 0, 120][i] * 1000,
}));

const month: ChartPoint[] = Array.from({ length: 30 }, (_, i) => ({
  label: String(i + 1),
  full: `${i + 1} de oct.`,
  income: Math.round(200 + Math.abs(Math.sin(i * 1.7)) * 600) * 1000,
  expenses: i % 3 === 1 ? Math.round(80 + Math.abs(Math.cos(i)) * 160) * 1000 : 0,
}));

const meta = {
  title: "Organismos/Finanzas/IncomeChart",
  component: IncomeChart,
  decorators: [(Story) => <div className="max-w-[760px] rounded-lg border border-border bg-surface p-4"><Story /></div>],
  args: { data: week },
} satisfies Meta<typeof IncomeChart>;
export default meta;

export const Semana: StoryObj<typeof meta> = {};
export const Mes: StoryObj<typeof meta> = { args: { data: month } };

const withStates: ChartPoint[] = week.map((p, i) => ({
  ...p,
  from: `2026-10-${10 + i}`,
  to: `2026-10-${10 + i}`,
  count: i < 2 ? 0 : 3,
  // Los dos primeros días son anteriores al negocio; el tercero existía pero no tuvo movimientos.
  state: i < 2 ? ("nodata" as const) : i === 2 ? ("empty" as const) : ("data" as const),
  income: i < 3 ? 0 : p.income,
  expenses: i < 3 ? 0 : p.expenses,
}));

/** «Sin datos» (el negocio aún no existía) no se dibuja como un cero; «sin movimientos» es una marca punteada. Clic o Enter abre el detalle. */
export const SinDatosYSinMovimientos: StoryObj<typeof meta> = {
  args: { data: withStates, onSelect: () => undefined },
};
