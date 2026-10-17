import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Sparkline } from "./sparkline";

const meta = {
  title: "Átomos/Sparkline",
  component: Sparkline,
  args: { values: [12, 18, 14, 22, 19, 27, 24, 31, 28, 36, 33, 41] },
  decorators: [(Story) => <div className="w-56"><Story /></div>],
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ink: Story = {};
export const Danger: Story = { args: { color: "var(--danger)", values: [4, 6, 5, 9, 7, 11, 8, 12] } };
export const Gold: Story = { args: { color: "var(--nx-gold-600)" } };
