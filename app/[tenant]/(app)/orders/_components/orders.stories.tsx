import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import type { OrderRow } from "@/lib/business/store/store-db";
import OrdersView from "./orders-view";

const order = (n: number, status: string, fulfillment: string, extra: Partial<OrderRow> = {}): OrderRow => ({ id: `o${n}`, code: `T-000${n}`, status, fulfillment, fromQuote: false, customerName: "María Pérez", phone: "300 123 4567", email: "maria@correo.com", address: "Calle 1 # 2-3", city: "Bogotá", notes: null, total: 278_000, review: null, createdAt: "2026-10-24T10:30:00.000Z", reference: "abcd2345efgh67", lines: [{ name: "Camiseta", quantity: 2, unitPrice: 119_000 }, { name: "Gorra", quantity: 1, unitPrice: 40_000 }], ...extra });

const meta = {
  title: "Páginas/Ventas/Pedidos",
  component: OrdersView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Todos los pedidos (de la tienda y de cotizaciones aprobadas) por cumplimiento: recibido → confirmado → en producción → listo → enviado → entregado. El pago es otra etiqueta y no se mezcla. La acción siguiente está a un toque; los demás pasos, en un selector. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", orders: [order(5, "PENDING_PAYMENT", "RECEIVED"), order(4, "PAID", "CONFIRMED", { review: "Sin existencias suficientes de «Camiseta»: revisa el pedido y coordina con el cliente." }), order(3, "PENDING_PAYMENT", "IN_PRODUCTION", { fromQuote: true }), order(2, "PAID", "READY"), order(1, "PAID", "DELIVERED"), order(6, "CANCELED", "CANCELED")] },
} satisfies Meta<typeof OrdersView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinPedidos: Story = { args: { orders: [] } };
/** Quien produce (sin manejar dinero): mueve pedidos pero no ve totales, cobros ni puede cancelar. */
export const SinDinero: Story = { args: { canCharge: false } };
