import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoadingToast } from "./loading-toast";

const meta = {
  title: "Moléculas/LoadingToast",
  component: LoadingToast,
  args: { open: true, progress: 0.55, label: "Exportando presupuesto…", doneLabel: "Exportado" },
  argTypes: { progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } } },
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Notificación fija abajo a la derecha para exportaciones: N con progreso real y barra oro en el borde inferior." } },
  },
  decorators: [(Story) => <div className="relative h-48"><Story /></div>],
} satisfies Meta<typeof LoadingToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Exporting: Story = {};
export const Done: Story = { args: { progress: 1 } };
