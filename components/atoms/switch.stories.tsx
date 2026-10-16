import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Label } from "./label";
import { Switch } from "./switch";

const meta = {
  title: "Átomos/Switch",
  component: Switch,
  args: { onCheckedChange: fn() },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { disabled: true } };
export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Switch id="activo" {...args} />
      <Label htmlFor="activo">Módulo activo</Label>
    </div>
  ),
};
