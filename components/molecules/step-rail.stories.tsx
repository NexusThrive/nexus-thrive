import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StepRail } from "./step-rail";

const meta = {
  title: "Moléculas/StepRail",
  component: StepRail,
  args: { steps: ["Perfil", "Tu negocio", "Plan y módulos", "Confirmación"], current: 2 },
  decorators: [(Story) => <div className="w-64 bg-ink p-8"><Story /></div>],
} satisfies Meta<typeof StepRail>;
export default meta;

export const EnCurso: StoryObj<typeof meta> = {};
export const Inicio: StoryObj<typeof meta> = { args: { current: 1 } };
export const Final: StoryObj<typeof meta> = { args: { current: 4 } };
