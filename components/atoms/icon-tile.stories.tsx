import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlertTriangle, Banknote, Check, MinusCircle, UserPlus } from "lucide-react";
import { IconTile } from "./icon-tile";

const meta = {
  title: "Átomos/IconTile",
  component: IconTile,
  args: { tone: "neutral", size: "md", children: <Banknote /> },
  argTypes: {
    tone: { control: "inline-radio", options: ["neutral", "gold", "ink", "success", "danger"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    children: { control: false },
  },
} satisfies Meta<typeof IconTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** El tono dice qué es: ingreso (neutro), gasto (oro), acción (tinta), estados. */
export const Tones: Story = {
  render: () => (
    <div className="flex gap-3">
      <IconTile><Banknote /></IconTile>
      <IconTile tone="gold"><MinusCircle /></IconTile>
      <IconTile tone="ink"><UserPlus /></IconTile>
      <IconTile tone="success"><Check /></IconTile>
      <IconTile tone="danger"><AlertTriangle /></IconTile>
    </div>
  ),
};
