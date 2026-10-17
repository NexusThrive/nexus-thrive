import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RevealRow } from "./reveal-row";

const meta = {
  title: "Átomos/RevealRow",
  component: RevealRow,
  args: { index: 0, children: "Fila" },
  parameters: {
    docs: { description: { component: "Envuelve una fila para que entre con un retardo de 120 ms × `index`. Sin movimiento si el sistema lo pide." } },
  },
} satisfies Meta<typeof RevealRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = {
  render: () => (
    <div className="max-w-md divide-y divide-border rounded-lg border border-border bg-card">
      {["Excavación manual", "Concreto 3000 psi", "Acero de refuerzo", "Mampostería"].map((name, index) => (
        <RevealRow key={name} index={index} className="px-4 py-3 text-sm">
          {name}
        </RevealRow>
      ))}
    </div>
  ),
};
