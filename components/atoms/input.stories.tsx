import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "Átomos/Input",
  component: Input,
  args: { placeholder: "Nombre de la obra" },
  argTypes: { type: { control: "select", options: ["text", "email", "number", "date", "file"] } },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="obra">Obra</Label>
      <Input id="obra" {...args} />
    </div>
  ),
};

export const Number: Story = { args: { type: "number", placeholder: "0,00", inputMode: "decimal" } };
export const File: Story = { args: { type: "file" } };
export const Disabled: Story = { args: { disabled: true, value: "OB-2026-014", readOnly: true } };
