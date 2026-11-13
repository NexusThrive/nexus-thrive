import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ConnectionCard, type ConnectionState } from "@/components/molecules/connection-card";
import { IntegrationsGrid } from "./integrations-grid";

const card = (name: string, kind: string, state: ConnectionState, extra: Partial<React.ComponentProps<typeof ConnectionCard>> = {}) => ({
  id: name,
  kind,
  card: <ConnectionCard name={name} kind={kind} description="Cobra en línea con este proveedor; el ingreso se registra al confirmarse." state={state} maturity="Disponible" managedBy="Dueño o Administración" href="#" actionLabel={`Abrir ${kind}`} {...extra} />,
});

const meta = {
  title: "Páginas/Integraciones/Rejilla",
  component: IntegrationsGrid,
  parameters: { layout: "padded" },
  args: {
    items: [
      card("Wompi", "Cobros en línea", "connected", { logo: "/integrations/wompi.svg", extra: <span className="text-xs text-muted-foreground">Comisión configurada</span>, environment: "sandbox", lastChecked: "Verificado hoy" }),
      card("WhatsApp Business", "Canales", "manual", { description: "Conecta tu número de WhatsApp Business para enviar y recibir desde Nexus." }),
      card("Proveedor de factura electrónica", "Factura electrónica", "disconnected", { lastChecked: "Sin verificar" }),
      card("Ficha de Google", "Presencia en línea", "attention", { error: "No pudimos verificar tu ficha de Google. Reconecta la herramienta." }),
      card("Importar y exportar", "Datos", "manual"),
    ],
  },
} satisfies Meta<typeof IntegrationsGrid>;
export default meta;
export const Rejilla: StoryObj<typeof meta> = {};
