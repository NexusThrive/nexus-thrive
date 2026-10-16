import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { AppTopbar } from "./app-topbar";
import { CommandPalette } from "./command-palette";

const meta = {
  title: "Organismos/AppTopbar",
  component: AppTopbar,
  decorators: [withShell],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/constructora/quotes" } },
    docs: {
      description: {
        component:
          "60 px con fondo de vidrio. Móvil: la N y el negocio; desde 768 px: el título de la sección y el buscador que abre la paleta (Ctrl K).",
      },
    },
  },
} satisfies Meta<typeof AppTopbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = { render: () => (<><AppTopbar /><CommandPalette /></>) };
export const Mobile: Story = { ...Desktop, globals: { viewport: { value: "mobile1" } } };
