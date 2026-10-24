import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UrlSegmentedControl } from "./url-segmented-control";

const meta = {
  title: "Moléculas/UrlSegmentedControl",
  component: UrlSegmentedControl,
  args: {
    param: "p",
    ariaLabel: "Periodo",
    value: "7d",
    defaultValue: "7d",
    options: [
      { value: "hoy", label: "Hoy" },
      { value: "7d", label: "7 días" },
      { value: "30d", label: "30 días" },
    ],
  },
  parameters: { docs: { description: { component: "Filtro que vive en la URL (`?p=hoy`): se puede compartir, recarga igual y la selección responde al instante (estado optimista)." } } },
} satisfies Meta<typeof UrlSegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
