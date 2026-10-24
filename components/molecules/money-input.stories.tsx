import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MoneyInput } from "./money-input";

const meta = {
  title: "Moléculas/MoneyInput",
  component: MoneyInput,
  args: { "aria-label": "Valor", placeholder: "0" },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
  parameters: { docs: { description: { component: "Campo de dinero con separador de miles en vivo; acepta coma decimal y entrega un número. Con `name` envía el valor limpio en el formulario." } } },
} satisfies Meta<typeof MoneyInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithValue: Story = { args: { defaultValue: 1250000 } };
export const Decimal: Story = { args: { defaultValue: 1250.5 } };
export const Disabled: Story = { args: { defaultValue: 90000, disabled: true } };
