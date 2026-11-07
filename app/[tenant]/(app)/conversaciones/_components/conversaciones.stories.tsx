import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import type { ConversationRow, MessageRow } from "@/lib/integrations/channels/conversations-db";
import ConversationsView from "./conversations-view";

const convo = (id: string, name: string, extra: Partial<ConversationRow> = {}): ConversationRow => ({ id, contactHandle: "573001112233", contactName: name, customerId: "c1", customerName: name, unread: 0, lastMessageAt: "2026-11-07T15:00:00.000Z", windowOpen: true, lastBody: "Hola, quiero 40 camisetas", ...extra });
const messages: MessageRow[] = [
  { id: "m1", direction: "IN", body: "Hola, quiero 40 camisetas con logo", status: "RECEIVED", error: null, createdAt: "2026-11-07T14:00:00.000Z" },
  { id: "m2", direction: "OUT", body: "¡Claro! Te cotizo hoy mismo.", status: "READ", error: null, createdAt: "2026-11-07T14:10:00.000Z" },
  { id: "m3", direction: "OUT", body: "Te envío la cotización por aquí.", status: "MANUAL", error: "Fuera de la ventana de 24 h", createdAt: "2026-11-07T14:20:00.000Z" },
];

const meta = {
  title: "Páginas/Canales/Conversaciones",
  component: ConversationsView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Lo que tus clientes escriben a tu propio WhatsApp. Dentro de las 24 h respondes con texto libre; fuera de la ventana o sin conexión, la respuesta queda lista para enviarla con un toque. Cada conversación pertenece a un contacto y aparece en su ficha. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", conversations: [convo("1", "Camila Torres", { unread: 2 }), convo("2", "Andrés Gómez", { windowOpen: false, lastBody: "Gracias" })], selected: "1", messages, connected: true },
} satisfies Meta<typeof ConversationsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinConexion: Story = { args: { connected: false } };
export const FueraDeLaVentana: Story = { args: { selected: "2" } };
export const SinConversaciones: Story = { args: { conversations: [], selected: null, messages: [] } };
