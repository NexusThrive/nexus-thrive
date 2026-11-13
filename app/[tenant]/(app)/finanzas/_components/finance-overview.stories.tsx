import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import { PageHeader } from "@/components/molecules/page-header";
import FinanceOverview from "./finance-overview";

const key = (back: number) => {
  const d = new Date(Date.UTC(2026, 10, 12 - back, 12));
  return d.toISOString().slice(0, 10);
};
const incomes = [0, 0, 180, 0, 95, 140, 0, 60, 220, 0, 75, 0, 130, 90, 0, 0, 160, 110, 0, 75, 0, 200, 85, 0, 140, 60, 0, 247, 75, 0];
const days = incomes.map((income, i) => ({ day: key(incomes.length - 1 - i), income: income * 1000, expenses: i === 27 ? 20_000 : 0 }));
const at = (h: number, m: number, d = 0) => new Date(Date.UTC(2026, 10, 12 - d, h + 5, m)).toISOString();

const sample = {
  slug: "demo",
  periodLabel: "últimos 30 días",
  monthLabel: "noviembre de 2026",
  series: {
    days,
    current: { income: 322_000, expenses: 20_000, balance: 302_000, count: 3 },
    previous: { income: 210_000, expenses: 40_000, balance: 170_000, count: 5 },
  },
  byMethod: [
    { method: "CASH" as const, total: 247_000 },
    { method: "TRANSFER" as const, total: 75_000 },
  ],
  movements: [
    { id: "m1", type: "in" as const, title: "Venta de mostrador", subtitle: "Pago · Efectivo", amount: 247_000, at: at(23, 33) },
    { id: "m2", type: "out" as const, title: "Servicios del local", subtitle: "Servicios · Caja menor", amount: 20_000, at: at(23, 23) },
    { id: "m3", type: "in" as const, title: "Venta de mostrador", subtitle: "Pago · Transferencia", amount: 75_000, at: at(23, 19) },
    { id: "m4", type: "in" as const, title: "Laura Gómez", subtitle: "Membresía mensual · Efectivo", amount: 120_000, at: at(15, 5, 1) },
  ],
  cash: { box: "Caja principal", amount: 247_000 },
};

const meta = {
  title: "Páginas/Finanzas/Resumen",
  component: FinanceOverview,
  decorators: [withShell],
  parameters: { layout: "fullscreen", docs: { description: { component: "El resumen de Finanzas como tablero de widgets: balance en la tarjeta de oro con su curva, gastos y caja menor al lado, tres cifras frente al periodo anterior, y abajo los movimientos por día con lo cobrado en la semana y por medio de pago." } } },
  args: sample,
  render: (args) => (
    <div className="mx-auto grid max-w-[1400px] gap-5 p-6">
      <PageHeader title="Finanzas" description="Cobros, gastos y caja menor de Simpleapp." />
      <FinanceOverview {...args} />
    </div>
  ),
} satisfies Meta<typeof FinanceOverview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConMovimientos: Story = {};
export const NegocioNuevo: Story = {
  args: {
    series: { days: days.map((d) => ({ ...d, income: 0, expenses: 0 })), current: { income: 0, expenses: 0, balance: 0, count: 0 }, previous: { income: 0, expenses: 0, balance: 0, count: 0 } },
    byMethod: [],
    movements: [],
    cash: { box: null, amount: null },
  },
};
