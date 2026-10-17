import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeToggle } from "./theme-toggle";

const meta = {
  title: "Átomos/ThemeToggle",
  component: ThemeToggle,
  parameters: {
    docs: {
      description: {
        story:
          "Cambia la clase `dark` de `<html>` y guarda la preferencia en `localStorage` (`nx-theme`). En Storybook también lo controla la barra de temas.",
      },
    },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
