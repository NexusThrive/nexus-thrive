import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { Odometer } from "./odometer";

const meta = {
  title: "Átomos/Odometer",
  component: Odometer,
  args: { value: "84.40", prefix: "$", className: "font-display text-6xl font-bold tracking-[-0.03em]" },
} satisfies Meta<typeof Odometer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {};

/** Cada dígito rueda hasta su valor de derecha a izquierda. */
export const Rolling: Story = {
  render: function Render(args) {
    const values = ["65", "84.40", "129", "7.50"];
    const [i, setI] = useState(0);
    return (
      <div className="flex items-end gap-6">
        <Odometer {...args} value={values[i]} />
        <Button size="sm" variant="outline" onClick={() => setI((i + 1) % values.length)}>Cambiar</Button>
      </div>
    );
  },
};
