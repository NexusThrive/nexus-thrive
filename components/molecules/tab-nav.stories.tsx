import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import TabNav from "./tab-nav";

const meta = {
  title: "Moléculas/TabNav",
  component: TabNav,
  args: {
    activeTab: "budget",
    tabs: [
      { value: "summary", label: "Ficha" },
      { value: "budget", label: "Presupuestador", count: 42 },
      { value: "quotes", label: "Cotizaciones", count: 3 },
      { value: "lean", label: "Planificador Lean" },
      { value: "field", label: "Bitácora y campo" },
      { value: "reports", label: "Informes" },
    ],
    children: <p className="text-sm text-muted-foreground">Contenido de la pestaña activa.</p>,
  },
  parameters: {
    nextjs: { navigation: { pathname: "/constructora/projects/123" } },
    docs: {
      description: {
        component:
          "Pestañas con la URL como fuente de verdad (`?tab=`): cada pestaña se vuelve a renderizar en el servidor. En el móvil la fila se desplaza horizontalmente.",
      },
    },
  },
} satisfies Meta<typeof TabNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mobile: Story = { globals: { viewport: { value: "mobile1" } } };
