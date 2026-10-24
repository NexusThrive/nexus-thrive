import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NLoader } from "./n-loader";

const meta = {
  title: "Átomos/NLoader",
  component: NLoader,
  args: { size: 64 },
  parameters: { docs: { description: { component: "Indicador de carga de marca: el trazo recorre el contorno de la N. `loop` cuando no se sabe cuánto falta; `prog` con `progress` (0–1) cuando sí; `done` al terminar." } } },
} satisfies Meta<typeof NLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loop: Story = { args: { phase: "loop" } };
export const Progress: Story = { args: { phase: "prog", progress: 0.6 } };
export const Done: Story = { args: { phase: "done" } };
