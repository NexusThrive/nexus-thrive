import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import { WompiConnection } from "./wompi-connection";

const meta = {
  title: "Páginas/Sistema/Integraciones/Wompi",
  component: WompiConnection,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Conexión de la cuenta Wompi de cada negocio. La llave pública define el entorno (pub_test_ o pub_prod_); los secretos se guardan cifrados y nunca se muestran. Sin conexión, el negocio cobra por transferencia o efectivo. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", connection: null, eventsUrl: null },
} satisfies Meta<typeof WompiConnection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinConectar: Story = {};
export const Conectado: Story = { args: { connection: { id: "c1", connected: true }, eventsUrl: "https://app.nexus.co/api/webhooks/providers/wompi/c1" } };
export const ConError: Story = { args: { connection: { id: "c1", connected: false }, eventsUrl: null } };
