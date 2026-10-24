import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { CommandPalette } from "./command-palette";
import { NavbarSearch } from "./navbar-search";

const meta = {
  title: "Organismos/NavbarSearch",
  component: NavbarSearch,
  decorators: [withShell],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Buscador de la navbar en PC. Al enfocarlo (o con Ctrl K) el campo se ensancha hacia los lados (320 ms) y, justo debajo y del mismo ancho, crece desde su borde un panel con resultados (clientes y catálogo desde 2 letras), secciones y acciones. No es un modal: sin fondo oscuro, sin foco atrapado y sin barra de scroll visible. Escape, elegir un resultado o salir del campo lo cierran. Bajo 768 px no se muestra: ahí manda la hoja de `CommandPalette`.",
      },
    },
  },
} satisfies Meta<typeof NavbarSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="mx-auto flex h-[480px] w-full max-w-[760px] justify-center pt-4">
      <NavbarSearch className="block" />
      <CommandPalette inlineOnDesktop />
    </div>
  ),
};
