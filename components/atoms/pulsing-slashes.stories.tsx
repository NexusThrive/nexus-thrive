import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PulsingSlashes } from "./pulsing-slashes";

const meta = {
  title: "Átomos/PulsingSlashes",
  component: PulsingSlashes,
  parameters: {
    docs: { description: { component: "Tres cortes con el ángulo de la N que pulsan en secuencia: carga en línea, junto a un texto." } },
  },
} satisfies Meta<typeof PulsingSlashes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Inline: Story = {
  render: () => (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      Sincronizando <PulsingSlashes />
    </p>
  ),
};
