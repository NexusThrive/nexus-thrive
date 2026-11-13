import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FullPanelLink } from "./full-panel-link";

const meta = {
  title: "Moléculas/FullPanelLink",
  component: FullPanelLink,
  args: { href: "#" },
  parameters: {
    docs: { description: { component: "«Abrir en el panel completo»: la salida de un mini-modal de creación hacia la sección del módulo. Va en la descripción del panel; quien lo usa cierra el modal al navegar. Es un enlace real, no un botón." } },
  },
} satisfies Meta<typeof FullPanelLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Tal como se ve en la descripción de un panel. */
export const EnLaDescripcion: Story = {
  render: (args) => (
    <p className="max-w-sm text-sm text-muted-foreground">
      Registra un gasto rápido. <FullPanelLink {...args} />
    </p>
  ),
};
