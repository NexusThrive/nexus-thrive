import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta = {
  title: "Átomos/Label",
  component: Label,
  args: { children: "Correo del cliente" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Con `peer`, el label se atenúa cuando el control está deshabilitado. */
export const WithDisabledControl: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="aiu" disabled />
      <Label htmlFor="aiu">Aplicar AIU</Label>
    </div>
  ),
};
