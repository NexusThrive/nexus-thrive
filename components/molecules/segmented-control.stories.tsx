import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SegmentedControl } from "./segmented-control";

const options = [
  { value: "all", label: "Todo" },
  { value: "payment", label: "Pagos" },
  { value: "expense", label: "Gastos" },
] as const;

const meta = {
  title: "Moléculas/SegmentedControl",
  component: SegmentedControl,
  args: { options, value: "all", onChange: fn(), ariaLabel: "Filtrar actividad" },
} satisfies Meta<typeof SegmentedControl<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Con contadores (filtros con resultados) y versión pequeña. */
export const WithCounts: Story = {
  args: {
    options: [
      { value: "all", label: "Todos", count: 14 },
      { value: "active", label: "Activos", count: 8 },
      { value: "due", label: "Por vencer", count: 2 },
      { value: "expired", label: "Vencidas", count: 2 },
    ],
  },
};

export const Interactive: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<string>("all");
    return <SegmentedControl {...args} value={value} onChange={setValue} />;
  },
};
