import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { CountUp } from "./count-up";

const cop = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;

const meta = {
  title: "Átomos/CountUp",
  component: CountUp,
  args: { value: 4820000, format: cop, className: "font-display text-3xl font-semibold tabular-nums" },
  argTypes: { format: { control: false } },
} satisfies Meta<typeof CountUp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Money: Story = {};

/** Al cambiar el valor cuenta desde el anterior (un pago nuevo en vivo). */
export const Changing: Story = {
  render: function Render(args) {
    const [value, setValue] = useState(4820000);
    return (
      <div className="flex items-center gap-4">
        <CountUp {...args} value={value} />
        <Button size="sm" variant="outline" onClick={() => setValue((v) => v + 142800)}>
          + Pago
        </Button>
      </div>
    );
  },
};
