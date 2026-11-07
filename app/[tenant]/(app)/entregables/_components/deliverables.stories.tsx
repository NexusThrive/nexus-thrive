import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import type { DeliverableRow } from "@/lib/business/customers/deliverables-db";
import DeliverablesView from "./deliverables-view";

const row = (id: string, title: string, status: DeliverableRow["status"], extra: Partial<DeliverableRow> = {}): DeliverableRow => ({ id, title, description: null, status, projectId: null, projectName: null, customerId: "c1", customerName: "Camila Torres", files: [{ id: `${id}f`, fileName: "logo-final.png", mimeType: "image/png", byteSize: 120_000 }], sentAt: null, decidedAt: null, decidedByName: null, clientComment: null, createdAt: "2026-11-05T10:00:00.000Z", ...extra });

const meta = {
  title: "Páginas/Ventas/Entregables",
  component: DeliverablesView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Lo que se entrega a un cliente: archivos, estado y la decisión del cliente (aprobado, o cambios pedidos con su comentario). El enlace de revisión se muestra una sola vez al enviar. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", projects: [{ id: "p1", name: "Campaña de marca" }], customers: [{ id: "c1", name: "Camila Torres" }], rows: [row("1", "Logo final", "DRAFT", { projectName: "Campaña de marca" }), row("2", "Banner de la tienda", "IN_REVIEW"), row("3", "Paleta de color", "APPROVED", { decidedByName: "Camila Torres", decidedAt: "2026-11-06T15:00:00.000Z" }), row("4", "Folleto", "CHANGES_REQUESTED", { decidedByName: "Camila Torres", clientComment: "El logo más grande y sin fondo." })] },
} satisfies Meta<typeof DeliverablesView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinEntregables: Story = { args: { rows: [] } };
