import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import PosView from "./pos-view";

const products = [
  { id: "p1", name: "Proteína whey 2 lb", price: 100_000, stock: 8, sku: "WHEY", taxRatePct: 19 },
  { id: "p2", name: "Barra de proteína", price: 5_000, stock: 120, sku: "BAR", taxRatePct: 0 },
  { id: "p3", name: "Shaker", price: 20_000, stock: 0, sku: null, taxRatePct: 19 },
  { id: "p4", name: "Agua", price: 3_000, stock: null, sku: null, taxRatePct: 0 },
];

const meta = {
  title: "Páginas/Dinero/Punto de venta",
  component: PosView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Cada cajero abre su turno en una terminal; vende varias líneas con descuento, propina y pago mixto (el efectivo que se pasa es cambio) y cierra con arqueo. Funciona en celular y tablet. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", canManage: true, terminals: [{ id: "t1", name: "Mostrador 1", busy: false }, { id: "t2", name: "Sede norte", busy: true }], turn: null, products },
} satisfies Meta<typeof PosView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinTurno: Story = {};
export const SinTerminales: Story = { args: { terminals: [] } };
export const Vendiendo: Story = { args: { turn: { sessionId: "s1", terminalName: "Mostrador 1", openingAmount: 50_000 } } };
