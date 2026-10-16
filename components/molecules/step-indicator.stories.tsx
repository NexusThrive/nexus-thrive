import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepIndicator } from "./step-indicator";

const meta = {
  title: "Moléculas/StepIndicator",
  component: StepIndicator,
  args: { steps: ["Perfil", "Información", "Módulos", "Finalización"], current: 2 },
  argTypes: { current: { control: { type: "range", min: 1, max: 4, step: 1 } } },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
} satisfies Meta<typeof StepIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Onboarding: Story = {};
export const Last: Story = { args: { current: 4 } };
