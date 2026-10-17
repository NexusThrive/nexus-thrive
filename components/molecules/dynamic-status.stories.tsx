import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DynamicStatus } from "./dynamic-status";

const meta = {
  title: "Moléculas/DynamicStatus",
  component: DynamicStatus,
  args: {
    messages: ["Preparando el informe…", "Calculando valor ganado…", "Armando el Excel…"],
    intervalMs: 1600,
  },
  parameters: { docs: { description: { component: "La N en bucle con mensajes que rotan cada `intervalMs`." } } },
} satisfies Meta<typeof DynamicStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
