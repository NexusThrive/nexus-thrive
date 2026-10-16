import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarProvider } from "@/components/providers/sidebar-context";
import Header from "./header";

const meta = {
  title: "Organismos/Header",
  component: Header,
  args: { tenantName: "Constructora Andina" },
  decorators: [(Story) => <SidebarProvider><Story /></SidebarProvider>],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Topbar de 56 px: nombre del negocio con su estado, tema y cuenta (Clerk; en Storybook se sustituye por un avatar). En móvil muestra el botón del menú y la N.",
      },
    },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};
export const Mobile: Story = { globals: { viewport: { value: "mobile1" } } };
