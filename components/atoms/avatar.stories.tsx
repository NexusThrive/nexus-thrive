import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const meta = {
  title: "Átomos/Avatar",
  component: Avatar,
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sin imagen: inicial sobre `--primary` (tinta en claro, oro en oscuro). */
export const Fallback: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarFallback>SN</AvatarFallback>
    </Avatar>
  ),
};

export const WithImage: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage src="/favicon.ico" alt="Constructora" />
      <AvatarFallback>CT</AvatarFallback>
    </Avatar>
  ),
};

/** Tamaños (28, 34, 52 px) y tonos: tinta, oro (cliente Gold) y neutro. */
export const SizesAndTones: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      <Avatar size="sm"><AvatarFallback>MT</AvatarFallback></Avatar>
      <Avatar><AvatarFallback tone="gold">CP</AvatarFallback></Avatar>
      <Avatar size="lg"><AvatarFallback tone="neutral">LG</AvatarFallback></Avatar>
    </div>
  ),
};
