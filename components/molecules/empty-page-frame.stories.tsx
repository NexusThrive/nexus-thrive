import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Users } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { EmptyPageFrame } from "./empty-page-frame";

const meta = {
  title: "Moléculas/EmptyPageFrame",
  component: EmptyPageFrame,
  // En Storybook no se anota la ruta como vacía: la marca vive en localStorage y alteraría las demás historias.
  args: { remember: false, children: null },
  argTypes: { children: { control: false }, preview: { control: "object" } },
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Marco del estado vacío de una vista entera: llena el alto disponible sin dejar scroll y centra el contenido. Con `preview`, detrás van datos de ejemplo difuminados (cómo se verá la lista con datos). `remember` anota la ruta como vacía para que la próxima precarga pinte este estado y no filas." } },
  },
} satisfies Meta<typeof EmptyPageFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

const contenido = (
  <div className="grid justify-items-center gap-3">
    <span className="grid size-12 place-items-center rounded-full bg-accent-subtle text-accent-text">
      <Users aria-hidden="true" className="size-5" />
    </span>
    <h2 className="font-display text-xl font-medium text-foreground">Aún no tienes clientes</h2>
    <p className="max-w-sm text-sm text-muted-foreground">Agrega el primero y aquí verás su historial, sus cobros y sus citas.</p>
    <Button variant="accent">Agregar cliente</Button>
  </div>
);

/** Solo el mensaje, centrado. */
export const Simple: Story = { render: (args) => <EmptyPageFrame {...args}>{contenido}</EmptyPageFrame> };

/** Con una tabla de ejemplo detrás: muestra cómo se verá la lista con datos. */
export const ConVistaPrevia: Story = {
  args: {
    preview: {
      columns: ["Cliente", "Teléfono", "Última visita", "Saldo", "Estado"],
      rows: [
        ["Laura Gómez", "300 123 4567", "12 oct.", "$ 0", "Al día"],
        ["Carlos Peña", "311 765 4321", "9 oct.", "$ 80.000", "Debe"],
        ["María Torres", "315 222 3344", "7 oct.", "$ 0", "Al día"],
        ["Andrés Pinzón", "320 555 6677", "2 oct.", "$ 35.000", "Debe"],
        ["Camila Torres", "301 888 9900", "28 sep.", "$ 0", "Al día"],
        ["Sofía Díaz", "304 111 2233", "25 sep.", "$ 0", "Al día"],
      ],
    },
  },
  render: (args) => <EmptyPageFrame {...args}>{contenido}</EmptyPageFrame>,
};
