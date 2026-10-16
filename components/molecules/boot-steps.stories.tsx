import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BootSteps } from "./boot-steps";

const meta = {
  title: "Moléculas/BootSteps",
  component: BootSteps,
  args: {
    steps: ["Leer el libro", "Importar capítulos", "Importar insumos y fotos", "Verificar costos directos"],
    activeIndex: 2,
  },
  argTypes: { activeIndex: { control: { type: "range", min: 0, max: 4, step: 1 } } },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
  parameters: { docs: { description: { component: "Pasos de un proceso largo: los anteriores al activo se muestran hechos (N rellena)." } } },
} satisfies Meta<typeof BootSteps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};
export const Finished: Story = { args: { activeIndex: 4 } };
