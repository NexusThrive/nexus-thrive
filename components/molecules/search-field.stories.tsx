import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SearchField } from "./search-field";

const meta = {
  title: "Moléculas/SearchField",
  component: SearchField,
  args: { placeholder: "Buscar por nombre, teléfono o plan", "aria-label": "Buscar clientes", shortcut: "/" },
  decorators: [(Story) => <div className="flex max-w-md"><Story /></div>],
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithShortcut: Story = {};
export const Plain: Story = { args: { shortcut: undefined } };
