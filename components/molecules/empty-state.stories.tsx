import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plus } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Moléculas/EmptyState",
  component: EmptyState,
  args: {
    title: "Todavía no hay obras",
    description: "Crea la primera obra para empezar su presupuesto y su cotización.",
  },
  parameters: {
    docs: {
      description: {
        component:
          "Estado vacío: texto a la izquierda con el botón para crear el primero y la N en contorno, grande y recortada en la esquina inferior derecha (como en el panel del acceso), detrás del texto. En una tabla o lista vacía, `action` lleva siempre el botón de crear; en «sin resultados» de una búsqueda, la salida es limpiar el filtro.",
      },
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    action: (
      <Button>
        <Plus aria-hidden="true" /> Nueva obra
      </Button>
    ),
  },
};

export const TitleOnly: Story = { args: { description: undefined, title: "Sin resultados" } };

export const WithIcon: Story = { args: { title: "No encontramos eso", description: "Prueba con otra palabra.", icon: <span aria-hidden="true">?</span> } };
