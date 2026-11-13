import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../../.storybook/decorators";
import type { OrderRow } from "@/lib/business/store/store-db";
import { OrderSheet } from "./order-sheet";

const base: OrderRow = {
  id: "o1",
  code: "T-0005",
  status: "PENDING_PAYMENT",
  fulfillment: "IN_PRODUCTION",
  fromQuote: false,
  opportunityId: null,
  customerName: "Camila Torres",
  phone: "300 123 4567",
  email: "camila@correo.com",
  address: "Cra 7 # 45-10, apto 502",
  city: "Bogotá",
  notes: "Entregar en portería antes de las 5 p. m.",
  total: 322_000,
  review: null,
  createdAt: new Date(Date.now() - 95 * 60_000).toISOString(),
  reference: "abcd2345efgh67",
  lines: [
    { name: "Camiseta", quantity: 2, unitPrice: 119_000 },
    { name: "Gorra", quantity: 1, unitPrice: 40_000 },
    { name: "Taza personalizada", quantity: 3, unitPrice: 14_000 },
  ],
};

const meta = {
  title: "Páginas/Ventas/Pedido (panel lateral)",
  id: "paginas-ventas-pedido-panel",
  component: OrderSheet,
  decorators: [withShell],
  args: { order: base, open: true, onOpenChange: () => undefined, slug: "demo", canCharge: true, onMove: () => undefined },
  argTypes: { order: { control: false }, onMove: { control: false }, onOpenChange: { control: false } },
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Lo que se ve al abrir un pedido desde su tarjeta: el recorrido, quién lo pidió, la entrega, los productos con su valor, las notas y el pago. Abajo, fijos, el total y las acciones (cancelar y el paso siguiente). Lo que pide datos —enviar, entregar— lo resuelve la lista con su diálogo." } },
  },
} satisfies Meta<typeof OrderSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** En producción, con pago pendiente y notas. */
export const Default: Story = {};

/** Recién recibido: el paso siguiente es confirmar. */
export const Recibido: Story = { args: { order: { ...base, fulfillment: "RECEIVED", notes: null } } };

/** Listo: además de entregar, se puede enviar. */
export const Listo: Story = { args: { order: { ...base, fulfillment: "READY", status: "PAID" } } };

/** Con una advertencia (por ejemplo, sin existencias suficientes). */
export const ConAdvertencia: Story = { args: { order: { ...base, fulfillment: "CONFIRMED", review: "Sin existencias suficientes de «Camiseta»: revisa el pedido y coordina con el cliente." } } };

/** Entregado: sin acciones, solo la constancia. */
export const Entregado: Story = { args: { order: { ...base, fulfillment: "DELIVERED", status: "PAID" } } };

/** Cancelado: el recorrido se reemplaza por un aviso. */
export const Cancelado: Story = { args: { order: { ...base, fulfillment: "CANCELED", status: "CANCELED" } } };

/** Llegó por otro canal y de una cotización: lleva su origen. */
export const PorOtroCanal: Story = { args: { order: { ...base, channel: "SHOPIFY", externalId: "SH-1001", fromQuote: true, opportunityId: "op1" } } };

/** Quien produce (sin manejar dinero): sin precios, total, pago ni cancelar. */
export const SinDinero: Story = { args: { canCharge: false } };
