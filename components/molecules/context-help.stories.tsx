import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ContextHelp } from "./context-help";

const meta = {
  title: "Moléculas/ContextHelp",
  component: ContextHelp,
  args: {
    topic: "el saldo a favor",
    children: "Dinero que el cliente pagó de más. Se descuenta solo de su próximo cobro.",
  },
  argTypes: { children: { control: "text" } },
  parameters: {
    docs: {
      description: {
        component:
          "Ayuda \"?\" accesible (toggletip de WAI-ARIA APG): hover con ratón, clic o toque para fijarla, Enter/Espacio con teclado, Escape para cerrar. Se anuncia a lectores de pantalla y va en un portal sobre cualquier tarjeta o modal.",
      },
    },
  },
  decorators: [
    (Story) => (
      <p className="flex items-center gap-1 pt-24 text-[13px] font-medium">
        Saldo a favor <Story />
      </p>
    ),
  ],
} satisfies Meta<typeof ContextHelp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Con enlace a la guía: el foco entra al contenido para poder seguirlo. */
export const WithGuide: Story = {
  args: { href: "https://nexusthrive.com.co/help", hrefLabel: "Cómo funciona el saldo" },
};
