import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AmountDisplay } from "./amount-display";

const meta = {
  title: "Átomos/AmountDisplay",
  component: AmountDisplay,
  args: { value: 1250000 },
  parameters: { docs: { description: { component: "Cifra de dinero con el símbolo atenuado. Para cifras que cuentan hasta su valor, `CountUp`." } } },
} satisfies Meta<typeof AmountDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: (args) => <p className="font-display text-3xl font-semibold"><AmountDisplay {...args} /></p> };
export const Zero: Story = { args: { value: 0 }, render: Default.render };
export const Negative: Story = { args: { value: -48000 }, render: Default.render };
