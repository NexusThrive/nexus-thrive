import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThreadsBackground } from "./threads-background";

const meta = {
  title: "Átomos/Presentación/ThreadsBackground",
  id: "átomos-threadsbackground",
  component: ThreadsBackground,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ThreadsBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sobre la tinta del marco del negocio (desde 768 px; en el celular no se pinta). */
export const Default: Story = {
  render: () => (
    <div className="relative h-dvh bg-ink">
      <ThreadsBackground className="absolute inset-0" />
    </div>
  ),
};
