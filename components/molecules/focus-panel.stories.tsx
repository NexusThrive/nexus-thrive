import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FocusPanel } from "./focus-panel";

const meta = {
  title: "Moléculas/FocusPanel",
  component: FocusPanel,
  args: {
    loading: true,
    label: "Recalculando el presupuesto",
    children: (
      <div className="space-y-2 p-6 text-sm">
        <p className="font-medium">Capítulo 2 · Cimentación</p>
        <p className="text-muted-foreground">14 partidas · $ 182.400.000</p>
      </div>
    ),
  },
  decorators: [(Story) => <div className="max-w-md rounded-lg border border-border bg-card"><Story /></div>],
  parameters: {
    docs: { description: { component: "Mientras `loading`, desenfoca el contenido y muestra la N con un texto; el contenido no se desmonta." } },
  },
} satisfies Meta<typeof FocusPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};
export const Ready: Story = { args: { loading: false } };
