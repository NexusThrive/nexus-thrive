import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { FocusText } from "./focus-text";

const meta = {
  title: "Átomos/FocusText",
  component: FocusText,
  args: { text: "Calculando el presupuesto…", className: "text-sm" },
  parameters: {
    docs: {
      description: {
        component:
          "El texto entra letra por letra con enfoque (como THRIVE en el logo). Al cambiar `text`, la línea anterior sale y la nueva entra. Respeta `prefers-reduced-motion`.",
      },
    },
  },
} satisfies Meta<typeof FocusText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Changing: Story = {
  render: function Render() {
    const messages = ["Leyendo el libro APU…", "Verificando costos directos…", "Listo"];
    const [index, setIndex] = useState(0);
    return (
      <div className="flex items-center gap-4">
        <FocusText text={messages[index]} className="text-sm" />
        <Button size="sm" variant="outline" onClick={() => setIndex((index + 1) % messages.length)}>
          Siguiente
        </Button>
      </div>
    );
  },
};
