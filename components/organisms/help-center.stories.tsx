import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToastProvider } from "@/components/molecules/toast";
import { HelpCenter } from "./help-center";

const meta = {
  title: "Organismos/HelpCenter",
  component: HelpCenter,
  args: { tenantSlug: "gym-norte", businessName: "Gimnasio Norte", activeModules: ["crm", "finance", "bookings"] },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Centro de ayuda: el «?» fijo en la esquina abre un panel que flota despegado de los bordes (`ResponsiveSheet drawer floating`; en móvil, hoja inferior). «Buscar» recorre el catálogo de funciones y lleva a la sección (o a Funciones si el negocio aún no la usa); «Contacto» ofrece correo, WhatsApp, mejorar el plan y el ID de soporte. No hay asistente con IA todavía.",
      },
    },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <div className="min-h-[480px] p-6 text-sm text-muted-foreground">Contenido de la página.<Story /></div>
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof HelpCenter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
