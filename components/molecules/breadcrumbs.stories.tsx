import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Breadcrumbs } from "./breadcrumbs";

const meta = {
  title: "Moléculas/Breadcrumbs",
  component: Breadcrumbs,
  parameters: { docs: { description: { component: "Ruta de navegación: `<nav>` con lista ordenada. Los pasos con `href` son enlaces, los demás (categorías) solo texto, y el último es la página actual (`aria-current`). Con menos de dos pasos no se pinta." } } },
} satisfies Meta<typeof Breadcrumbs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Seccion: Story = {
  args: { items: [{ label: "Inicio", href: "/gym-norte" }, { label: "Ventas y cobros" }, { label: "Cartera", href: "/gym-norte/cartera" }] },
};
export const Detalle: Story = {
  args: { items: [{ label: "Inicio", href: "/gym-norte" }, { label: "Clientes y agenda" }, { label: "Socios", href: "/gym-norte/crm" }, { label: "Detalle" }] },
};
