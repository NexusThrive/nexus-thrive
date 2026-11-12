import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IndeterminateBar } from "./indeterminate-bar";

const meta = {
  title: "Átomos/Datos/IndeterminateBar",
  id: "átomos-indeterminatebar",
  component: IndeterminateBar,
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof IndeterminateBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
