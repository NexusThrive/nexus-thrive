import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Users } from "lucide-react";
import MetricCard from "./metric-card";

const meta = {
  title: "Moléculas/MetricCard",
  component: MetricCard,
  args: { title: "Clientes activos", value: "248", description: "18 nuevos este mes", icon: Users },
  argTypes: { icon: { control: false } },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
  parameters: {
    docs: { description: { component: "Adaptador del dashboard: recibe un `DashboardMetric` y lo pinta con `KpiCard`." } },
  },
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Alert: Story = { args: { title: "Membresías vencidas", value: "6", alert: true } };
