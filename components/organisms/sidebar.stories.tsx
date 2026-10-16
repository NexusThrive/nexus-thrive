import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidebarProvider } from "@/components/providers/sidebar-context";
import Sidebar from "./sidebar";

const meta = {
  title: "Organismos/Sidebar",
  component: Sidebar,
  args: {
    tenantSlug: "constructora",
    tenantName: "Constructora Andina",
    vertical: "construction",
    activeModules: ["dashboard", "crm", "quotes", "finance"],
  },
  argTypes: {
    vertical: { control: "select", options: ["construction", "gym", "tourism_agency", "hospitality"] },
  },
  decorators: [(Story) => <SidebarProvider><Story /></SidebarProvider>],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/constructora/projects" } },
    docs: {
      description: {
        component:
          "Navegación del negocio (232 px). Solo muestra los módulos activos, con el vocabulario de la vertical (Obras, Socios, Pacientes…). En móvil es un cajón que abre el botón de la topbar.",
      },
    },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Construction: Story = {};
export const Gym: Story = {
  args: { tenantSlug: "gym-norte", tenantName: "Gym Norte", vertical: "gym", activeModules: ["dashboard", "crm", "memberships", "bookings", "finance"] },
  parameters: { nextjs: { navigation: { pathname: "/gym-norte/memberships" } } },
};
