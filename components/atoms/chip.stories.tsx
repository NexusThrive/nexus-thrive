import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Chip, ChipRow } from "./chip";

const meta = {
  title: "Átomos/Chip",
  component: Chip,
  args: { children: "Nequi", selected: false },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const WithCount: Story = { args: { children: "Corte y barba", count: "45 min" } };

/** Selección única (medio de pago): se hunde y rebota al pulsarlo. */
export const SingleChoice: Story = {
  render: function Render() {
    const [value, setValue] = useState("Nequi");
    return (
      <ChipRow className="max-w-sm">
        {["Nequi", "Efectivo", "Tarjeta", "Transferencia"].map((method) => (
          <Chip key={method} selected={method === value} onClick={() => setValue(method)}>
            {method}
          </Chip>
        ))}
      </ChipRow>
    );
  },
};
