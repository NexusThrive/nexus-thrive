import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../../.storybook/decorators";
import type { LeadFormRow } from "@/lib/business/growth/lead-forms-db";
import FormsView from "./forms-view";

const form = (id: string, name: string, extra: Partial<LeadFormRow> = {}): LeadFormRow => ({ id, name, publicKey: "lf_0123456789abcdef0123456789abcdef", allowedOrigins: ["https://mitienda.com", "https://www.mitienda.com"], campaign: null, enabled: true, createdAt: "2026-11-01T12:00:00.000Z", ...extra });

const meta = {
  title: "Páginas/Ventas/Formularios web",
  component: FormsView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Recibe interesados desde cualquier web. La clave de cada formulario es pública: solo acepta envíos desde los dominios registrados, con límite y anti-spam. Cada envío crea el contacto y su oportunidad. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", appUrl: "https://app.nexus.co", forms: [form("1", "Landing de camisetas", { campaign: "lanzamiento-noviembre" }), form("2", "Formulario viejo", { enabled: false, allowedOrigins: ["https://blog.mitienda.com"] })] },
} satisfies Meta<typeof FormsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinFormularios: Story = { args: { forms: [] } };
