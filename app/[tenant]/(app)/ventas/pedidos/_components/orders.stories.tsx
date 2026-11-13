import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../../.storybook/decorators";
import type { OrderRow } from "@/lib/business/store/store-db";
import OrdersView from "./orders-view";

const NAMES = ["María Pérez", "Carlos Peña", "Laura Gómez", "Andrés Pinzón", "Camila Torres", "Sofía Díaz"];
const PRODUCTS = [{ name: "Camiseta", unitPrice: 119_000 }, { name: "Gorra", unitPrice: 40_000 }, { name: "Taza personalizada", unitPrice: 28_000 }, { name: "Sudadera con capota", unitPrice: 165_000 }];

/** Pedido de muestra: cliente, hora y productos varían con `n` para que la cuadrícula se parezca a una real. */
const order = (n: number, status: string, fulfillment: string, extra: Partial<OrderRow> = {}): OrderRow => {
  const lines = [0, 1, 2, 3].slice(0, 1 + (n % 4)).map((k) => ({ ...PRODUCTS[(n + k) % PRODUCTS.length]!, quantity: 1 + ((n + k) % 3) }));
  return { id: `o${n}`, code: `T-${String(n).padStart(4, "0")}`, status, fulfillment, fromQuote: false, opportunityId: null, customerName: NAMES[n % NAMES.length]!, phone: "300 123 4567", email: "cliente@correo.com", address: "Calle 1 # 2-3", city: "Bogotá", notes: null, total: lines.reduce((t, l) => t + l.quantity * l.unitPrice, 0), review: null, createdAt: new Date(Date.now() - n * 47 * 60_000).toISOString(), reference: "abcd2345efgh67", lines, ...extra };
};

const meta = {
  title: "Páginas/Ventas/Pedidos",
  component: OrdersView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Todos los pedidos (de la tienda y de cotizaciones aprobadas) por cumplimiento: recibido → confirmado → en producción → listo → enviado → entregado. El pago es otra etiqueta y no se mezcla. Se ven en tarjetas, con filtro por paso, búsqueda y paginación. La acción siguiente está a un toque en la tarjeta; el resto (enviar, otro paso, confirmar el pago, entrega y notas) está en su panel lateral, que se abre desde el encabezado. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", orders: [order(5, "PENDING_PAYMENT", "RECEIVED"), order(4, "PAID", "CONFIRMED", { review: "Sin existencias suficientes de «Camiseta»: revisa el pedido y coordina con el cliente." }), order(3, "PENDING_PAYMENT", "IN_PRODUCTION", { fromQuote: true }), order(2, "PAID", "READY"), order(1, "PAID", "DELIVERED"), order(6, "CANCELED", "CANCELED")] },
} satisfies Meta<typeof OrdersView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinPedidos: Story = { args: { orders: [] } };
/** Quien produce (sin manejar dinero): mueve pedidos pero no ve totales, cobros ni puede cancelar. */
export const SinDinero: Story = { args: { canCharge: false } };

/** Pedidos que llegaron por otros canales llevan su canal y el identificador que tenían allá. */
export const PorVariosCanales: Story = { args: { orders: [order(7, "PENDING_PAYMENT", "RECEIVED", { channel: "SHOPIFY", externalId: "SH-1001" }), order(6, "PENDING_PAYMENT", "RECEIVED", { channel: "WHATSAPP" }), order(5, "PAID", "CONFIRMED")] } };

/** Más de una página: el pie muestra el rango y los números de página. */
export const ConMuchosPedidos: Story = {
  args: { orders: Array.from({ length: 30 }, (_, i) => order(30 - i, i % 4 === 0 ? "PAID" : "PENDING_PAYMENT", (["RECEIVED", "CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED"] as const)[i % 5]!)) },
};
