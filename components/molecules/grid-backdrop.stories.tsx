import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GridBackdrop } from "./grid-backdrop";

const meta = {
  title: "Moléculas/GridBackdrop",
  component: GridBackdrop,
  args: { variant: "default" },
  argTypes: { variant: { control: "inline-radio", options: ["default", "home"] }, className: { control: false } },
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Cuadrícula decorativa de fondo (la del 404 y la de Inicio): `aria-hidden`, sin puntero y sin movimiento. Se desvanece hacia los bordes con una máscara radial. Va dentro de un contenedor `relative` que le da el alto." } },
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", isolation: "isolate", minHeight: 360, display: "grid", placeItems: "center" }}>
        <Story />
        <p className="font-display text-xl font-medium text-foreground">Contenido encima del fondo</p>
      </div>
    ),
  ],
} satisfies Meta<typeof GridBackdrop>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Cuadros de 64 px, como el 404. */
export const Default: Story = {};

/** Cuadros de 58 px más tenues, centrados más abajo (Inicio). */
export const Inicio: Story = { args: { variant: "home" } };
