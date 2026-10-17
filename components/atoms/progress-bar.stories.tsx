import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressBar } from "./progress-bar";

const meta = {
  title: "Átomos/ProgressBar",
  component: ProgressBar,
  args: { value: 0.42, label: "Avance físico" },
  argTypes: {
    value: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    tone: { control: "inline-radio", options: ["ink", "gold"] },
  },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ink: Story = {};
/** Oro = en curso. */
export const Gold: Story = { args: { tone: "gold", value: 0.68 } };
export const Complete: Story = { args: { value: 1 } };
