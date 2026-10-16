import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Package } from "lucide-react";
import ModulePlaceholder from "./module-placeholder";

const meta = {
  title: "Plantillas/ModulePlaceholder",
  component: ModulePlaceholder,
  args: {
    title: "Inventario",
    description: "Controla existencias, entradas y salidas de bodega.",
    icon: Package,
  },
  argTypes: { icon: { control: false } },
  parameters: { docs: { description: { component: "Página de un módulo aún sin construir." } } },
} satisfies Meta<typeof ModulePlaceholder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
