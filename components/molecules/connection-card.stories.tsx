import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ConnectionCard } from "./connection-card";

const meta = {
  title: "Moléculas/Contenido/ConnectionCard",
  id: "moléculas-connectioncard",
  component: ConnectionCard,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[min(100vw-32px,380px)]">
        <Story />
      </div>
    ),
  ],
  args: {
    name: "Wompi",
    kind: "Cobros en línea",
    description: "Cobra en línea con un proveedor de pagos; el ingreso se registra al confirmarse.",
    state: "connected",
    maturity: "En prueba",
    environment: "sandbox",
    lastChecked: "Verificado hoy a las 3:00 p. m.",
    managedBy: "Dueño o Administración",
    href: "#cobros",
    actionLabel: "Abrir Cobros en línea",
  },
} satisfies Meta<typeof ConnectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Conectado: Story = {};

export const Desconectado: Story = {
  args: { state: "disconnected", environment: undefined, lastChecked: "Sin verificar", description: "Aún no conectas un proveedor de pagos." },
};

export const RequiereAtencion: Story = {
  args: {
    state: "attention",
    environment: "production",
    lastChecked: "Verificado ayer a las 9:10 a. m.",
    error: "No pudimos verificar Wompi: la llave fue rechazada. Reconecta la herramienta o revisa tus credenciales.",
  },
};

/** Una herramienta que no se conecta a un servicio: se describe lo que hace de verdad. */
export const UsoManual: Story = {
  args: {
    name: "WhatsApp",
    kind: "Canales",
    description: "Envía mensajes desde plantillas: se abre la conversación en WhatsApp con el texto listo.",
    state: "manual",
    maturity: "Disponible",
    environment: undefined,
    lastChecked: undefined,
    managedBy: "Todo el equipo",
    href: "#whatsapp",
    actionLabel: "Abrir WhatsApp",
  },
};

export const NombreLargo: Story = {
  args: {
    name: "Proveedor tecnológico de factura electrónica con un nombre muy largo",
    kind: "Factura electrónica",
    state: "disconnected",
    environment: undefined,
    lastChecked: "Sin verificar",
  },
};
