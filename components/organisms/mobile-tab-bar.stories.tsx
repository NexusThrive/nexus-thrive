import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { MobileTabBar } from "./mobile-tab-bar";

const meta = {
  title: "Organismos/MobileTabBar",
  component: MobileTabBar,
  decorators: [withShell],
  globals: { viewport: { value: "mobile1" } },
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/constructora/projects" } },
    docs: {
      story: { inline: false, iframeHeight: 560 },
      description: {
        component:
          "Tres secciones, el botón central Crear (abre las acciones) y Más (el resto). El corte oro se desliza a la pestaña activa y la barra se esconde al bajar.",
      },
    },
  },
} satisfies Meta<typeof MobileTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <div className="h-[560px]"><MobileTabBar /></div> };
