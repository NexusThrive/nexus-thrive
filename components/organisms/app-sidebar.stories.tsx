import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { AppSidebar } from "./app-sidebar";

const meta = {
  title: "Organismos/AppSidebar",
  component: AppSidebar,
  decorators: [withShell],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/constructora/projects" } },
    docs: {
      story: { inline: false, iframeHeight: 640 },
      description: {
        component:
          "Riel de 76 px en tablet o contraída; 248 px con el logo completo desde 1200 px. El fondo del activo se desliza con el corte oro; pasa el cursor por el riel para ver los tooltips. Oculta en móvil.",
      },
    },
  },
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = { render: () => <div className="h-[640px]"><AppSidebar /></div> };
export const Tablet: Story = { ...Desktop, globals: { viewport: { value: "tablet" } } };
