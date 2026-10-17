import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Select } from "./select";

const meta = {
  title: "Átomos/Select",
  component: Select,
  args: {
    "aria-label": "Medio de pago",
    children: ["Nequi", "Efectivo", "Tarjeta", "Transferencia"].map((m) => <option key={m}>{m}</option>),
  },
  argTypes: { children: { control: false } },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { "aria-invalid": true } };
