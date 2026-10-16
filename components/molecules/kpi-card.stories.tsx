import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertTriangle, Building2, HandCoins, Wallet } from "lucide-react";
import { KpiCard } from "./kpi-card";

const meta = {
  title: "Moléculas/KpiCard",
  component: KpiCard,
  args: { label: "Obras activas", value: "12", hint: "3 en ejecución", icon: Building2 },
  argTypes: { icon: { control: false } },
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const narrow = [(Story: React.ComponentType) => <div className="max-w-xs"><Story /></div>];

export const Default: Story = { decorators: narrow };

/** El punto rojo de 6 px marca una alerta real; el número sigue en tinta. */
export const Alert: Story = {
  args: { label: "Cuotas vencidas", value: "4", hint: "Desde hace más de 30 días", icon: AlertTriangle, alert: true },
  decorators: narrow,
};

export const Compact: Story = { args: { compact: true }, decorators: narrow };

export const Row: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCard label="Ingresos del mes" value="$ 48.200.000" hint="+12 % frente a septiembre" icon={HandCoins} />
      <KpiCard label="Gastos del mes" value="$ 9.870.000" icon={Wallet} />
      <KpiCard label="Cuotas vencidas" value="4" hint="Revisar cartera" icon={AlertTriangle} alert />
    </div>
  ),
};
