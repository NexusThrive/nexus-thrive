import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Brand, LogoMark } from "./logo";

const meta = {
  title: "Átomos/Logo",
  component: Brand,
  args: { tone: "on-paper", size: 80, showMark: true },
  argTypes: { tone: { control: "inline-radio", options: ["on-paper", "on-ink", "on-sidebar"] } },
} satisfies Meta<typeof Brand>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Lockup: Story = {};

/** Sobre Ink el logo va en Paper. Nunca recolorear la N en oro. */
export const OnInk: Story = {
  args: { tone: "on-ink" },
  decorators: [(Story) => <div className="inline-block bg-ink p-6"><Story /></div>],
};

export const Mark: Story = {
  render: () => (
    <div className="flex items-end gap-4 text-foreground">
      <LogoMark size={20} />
      <LogoMark size={28} />
      <LogoMark size={48} />
    </div>
  ),
};
