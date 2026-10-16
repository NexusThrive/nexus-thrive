import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppearanceSettings } from "./appearance-settings";

const meta = {
  title: "Organismos/AppearanceSettings",
  component: AppearanceSettings,
  parameters: {
    docs: { description: { component: "Ajustes de tema, densidad, barra compacta y movimiento; se guardan en el navegador y se aplican al instante." } },
  },
} satisfies Meta<typeof AppearanceSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
