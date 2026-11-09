import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { EMPTY_OPERATION, type OperationAnswers } from "@/lib/core/tenancy/onboarding/operation";
import OperationStep from "./operation-step";

function Demo({ running }: { running: boolean }) {
  const [value, setValue] = useState<OperationAnswers>(EMPTY_OPERATION);
  return (
    <div className="max-w-2xl p-5">
      <OperationStep value={value} onChange={setValue} running={running} />
    </div>
  );
}

const meta = {
  title: "Páginas/Onboarding/Tu operación",
  component: OperationStep,
  parameters: { layout: "fullscreen", docs: { description: { component: "Paso «Tu operación» del registro: qué vende, cómo vende, qué quiere controlar y qué usa hoy. Todo es opcional; lo que marque prepara las capacidades del primer día." } } },
  args: { value: EMPTY_OPERATION, onChange: () => {}, running: false },
} satisfies Meta<typeof OperationStep>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Emprendiendo: Story = { render: () => <Demo running={false} /> };
export const EnFuncionamiento: Story = {
  render: () => <Demo running />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("¿Qué usas hoy para administrarlo?")).toBeVisible();
    const sale = c.getByRole("button", { name: /Vendo en mostrador/ });
    await userEvent.click(sale);
    await expect(sale).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(sale);
    await expect(sale).toHaveAttribute("aria-pressed", "false");
  },
};
