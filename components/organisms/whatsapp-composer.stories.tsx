import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WhatsAppComposer } from "./whatsapp-composer";

const meta = {
  title: "Organismos/WhatsAppComposer",
  component: WhatsAppComposer,
  args: {
    businessName: "Barbería El Caballero",
    storageKey: "sb:wa-sent",
    contacts: [
      { id: "1", name: "Laura Gómez", phone: "300 123 4567" },
      { id: "2", name: "Carlos Peña", phone: "310 987 6543" },
      { id: "3", name: "Sofía Díaz", phone: "315 555 0101" },
    ],
  },
  parameters: { docs: { description: { component: "Clientes con teléfono, plantillas en chips, vista previa y envío que abre WhatsApp con el texto listo. Lo enviado se recuerda en el navegador." } } },
} satisfies Meta<typeof WhatsAppComposer>;
export default meta;

export const Escritorio: StoryObj<typeof meta> = {};
export const Movil: StoryObj<typeof meta> = { globals: { viewport: { value: "mobile1" } } };
