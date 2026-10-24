import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UsdInput } from "./usd-input";

function Demo() {
  const [cents, setCents] = useState(12550);
  return (
    <div className="max-w-xs">
      <UsdInput value={cents} onChange={setCents} />
      <p className="mt-2 text-xs text-muted-foreground">{cents} centavos</p>
    </div>
  );
}

const meta = {
  title: "Moléculas/UsdInput",
  component: UsdInput,
  args: { value: 0, onChange: () => {} },
  parameters: { docs: { description: { component: "Dólares con entrada en centavos: evita errores de punto flotante." } } },
} satisfies Meta<typeof UsdInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <Demo /> };
export const Disabled: Story = { args: { value: 5000, disabled: true } };
