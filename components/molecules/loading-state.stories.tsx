import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoadingState } from "./loading-state";

const meta = {
  title: "Moléculas/LoadingState",
  component: LoadingState,
  args: { label: "Cargando clientes…" },
} satisfies Meta<typeof LoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Block: Story = {};
export const Inline: Story = { args: { inline: true, label: "Buscando…" } };
