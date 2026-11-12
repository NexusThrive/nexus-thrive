"use client";

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { RollingNumber } from "./rolling-number";

const meta = {
  title: "Átomos/RollingNumber",
  component: RollingNumber,
  args: { value: 4860000, format: "cop" },
  argTypes: { format: { control: "inline-radio", options: ["number", "cop"] }, className: { control: false } },
  parameters: {
    docs: { description: { component: "Cifra que rueda hasta su valor: cuenta desde el valor anterior (desde cero la primera vez) y los últimos tres dígitos corren con un fundido que se aclara al asentarse. Escribe en el DOM sin re-renderizar React. El texto inicial ya es el valor final (servidor y lectores de pantalla). Con movimiento reducido solo cambia el texto. Cifras con `tabular-nums`." } },
  },
  decorators: [(Story) => <p className="font-display text-3xl font-medium tabular-nums text-foreground"><Story /></p>],
} satisfies Meta<typeof RollingNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pesos colombianos. */
export const Default: Story = {};

/** Un conteo simple, sin moneda. */
export const Numero: Story = { args: { value: 1284, format: "number" } };

/** Cambia el valor: rueda desde el anterior, no desde cero. */
export const CambiaDeValor: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- render de historia con estado propio
    const [value, setValue] = useState(args.value);
    return (
      <div className="grid justify-items-start gap-4">
        <RollingNumber {...args} value={value} />
        <Button variant="outline" size="sm" onClick={() => setValue(Math.round(Math.random() * 9_000_000))}>
          Cambiar valor
        </Button>
      </div>
    );
  },
};
