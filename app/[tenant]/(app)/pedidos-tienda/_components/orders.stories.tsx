import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import OrdersView from "./orders-view";

const order = (n: number, status: string, extra = {}) => ({ id: `o${n}`, code: `T-000${n}`, status, customerName: "María Pérez", phone: "300 123 4567", email: "maria@correo.com", address: "Calle 1 # 2-3", city: "Bogotá", notes: null, total: 278_000, review: null, createdAt: "2026-10-24T10:30:00.000Z", reference: "abcd2345efgh67", lines: [{ name: "Camiseta", quantity: 2, unitPrice: 119_000 }, { name: "Gorra", quantity: 1, unitPrice: 40_000 }], ...extra });

const meta = {
  title: "Páginas/Visibilidad/Pedidos de la tienda",
  component: OrdersView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Pedidos que llegan del mini-sitio: datos del cliente con enlace a su WhatsApp, líneas, estado (esperando pago, pagado, abandonado) y avisos a revisar (p. ej. se pagó sin existencias). Cancelar solo vale para los no pagados." } } },
  args: { slug: "demo", orders: [order(3, "PENDING_PAYMENT"), order(2, "PAID", { review: "Sin existencias suficientes de «Camiseta»: revisa el pedido y coordina con el cliente." }), order(1, "ABANDONED")] },
} satisfies Meta<typeof OrdersView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinPedidos: Story = { args: { orders: [] } };
