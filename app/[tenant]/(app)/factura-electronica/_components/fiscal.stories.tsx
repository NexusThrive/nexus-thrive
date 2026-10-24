import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import FiscalView from "./fiscal-view";

const doc = (id: string, code: string, kind: "INVOICE" | "CREDIT_NOTE" | "DEBIT_NOTE" | "SUPPORT_DOCUMENT", status: string, total: number, extra = {}) => ({ id, code, kind, status, provider: "sandbox", cufe: null, rejectReason: null, attempts: 1, total, acquirer: "María Pérez", createdAt: "2026-10-24T10:00:00.000Z", ...extra });
const docs = [
  doc("1", "V-000042", "INVOICE", "ACCEPTED", 119_000, { cufe: "a".repeat(64) }),
  doc("2", "V-000043", "INVOICE", "REJECTED", 800_000, { rejectReason: "El adquirente necesita número de documento cuando el total llega a 500.000 (regla del proveedor de prueba)." }),
  doc("3", "NC-000003", "CREDIT_NOTE", "PENDING_PROVIDER", 10_000),
  doc("4", "DS-CUENTA-55", "SUPPORT_DOCUMENT", "PENDING_PROVIDER", 200_000),
];

const meta = {
  title: "Páginas/Finanzas/Factura electrónica",
  component: FiscalView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Cada venta, nota crédito o débito deja su documento fiscal en cola y se entrega a un proveedor tecnológico por un puerto; vender nunca se bloquea. El rechazo muestra su causa legible y se puede reintentar. NEXUS no firma XML propio. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", settings: { enabled: true, provider: "sandbox", connected: true, pending: 2 }, docs },
} satisfies Meta<typeof FiscalView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinProveedor: Story = { args: { settings: { enabled: true, provider: null, connected: false, pending: 4 } } };
export const Desactivada: Story = { args: { settings: { enabled: false, provider: null, connected: false, pending: 0 }, docs: [] } };
