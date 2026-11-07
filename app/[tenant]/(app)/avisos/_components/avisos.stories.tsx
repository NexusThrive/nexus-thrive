import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import type { NoticeRow, TemplateRow } from "@/lib/integrations/channels/notices-db";
import NoticesView from "./notices-view";

const tpl = (key: string, title: string, event: string | null, extra: Partial<TemplateRow> = {}): TemplateRow => ({ id: key, key, title, body: "Hola {{nombre}}, recibimos el pago de tu pedido {{codigo}} por {{total}}. — {{negocio}}", event, metaName: null, metaStatus: "NONE", language: "es", enabled: true, variables: ["nombre", "codigo", "total", "negocio"], ...extra });
const notice = (id: string, name: string, status: NoticeRow["status"], extra: Partial<NoticeRow> = {}): NoticeRow => ({ id, customerId: id, customerName: name, templateKey: "pedido_pagado", event: "order.paid", status, reason: null, text: "Hola, recibimos el pago de tu pedido T-0042.", link: null, createdAt: "2026-11-07T15:00:00.000Z", ...extra });

const meta = {
  title: "Páginas/Canales/Plantillas y avisos",
  component: NoticesView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "El texto de cada aviso, su aprobación en Meta y lo que salió. Dentro de las 24 h sale texto libre; fuera, solo plantillas aprobadas; si no, queda listo para enviar con un toque. Sin consentimiento no sale solo y una baja lo bloquea todo. Las acciones son de muestra en Storybook." } } },
  args: {
    slug: "demo",
    connected: true,
    templates: [tpl("pedido_pagado", "Pago recibido", "order.paid", { metaStatus: "APPROVED", metaName: "pedido_pagado_v1" }), tpl("pedido_creado", "Pedido recibido", "order.created", { metaStatus: "PENDING" }), tpl("carrito_abandonado", "Pedido sin pagar", "cart.abandoned", { enabled: false })],
    notices: [
      notice("1", "Camila Torres", "SENT"),
      notice("2", "Andrés Gómez", "MANUAL", { reason: "Pasaron más de 24 h desde su último mensaje y no hay una plantilla aprobada por Meta.", link: "https://wa.me/573105550000?text=Hola" }),
      notice("3", "Laura Pérez", "BLOCKED", { reason: "El contacto pidió no recibir más avisos (baja).", text: null }),
    ],
  },
} satisfies Meta<typeof NoticesView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinConexion: Story = { args: { connected: false, notices: [] } };
