import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Kbd } from "./kbd";

const meta = { title: "Átomos/Kbd", component: Kbd, args: { children: "Ctrl K" } } satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Shortcuts: Story = {
  render: () => (
    <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> mover</span>
      <span><Kbd>Enter</Kbd> abrir</span>
      <span><Kbd>Esc</Kbd> cerrar</span>
      <span><Kbd>/</Kbd> buscar</span>
    </p>
  ),
};
