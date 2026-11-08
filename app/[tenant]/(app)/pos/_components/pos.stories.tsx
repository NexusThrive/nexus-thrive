import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { withShell } from "../../../../../.storybook/decorators";
import PosView from "./pos-view";

const products = [
  { id: "p1", name: "Proteína whey 2 lb", price: 100_000, stock: 8, sku: "WHEY", taxRatePct: 19 },
  { id: "p2", name: "Barra de proteína", price: 5_000, stock: 120, sku: "BAR", taxRatePct: 0 },
  { id: "p3", name: "Shaker", price: 20_000, stock: 0, sku: null, taxRatePct: 19 },
  { id: "p4", name: "Agua", price: 3_000, stock: null, sku: null, taxRatePct: 0 },
  { id: "p5", name: "Camiseta personalizada", price: 45_000, stock: null, sku: null, taxRatePct: 19, customizable: true, categoryId: "c2" },
];
const categories = [{ id: "c1", name: "Suplementos", parentId: null }, { id: "c2", name: "Merchandising", parentId: null }];
const customers = [{ id: "u1", name: "María Pérez" }, { id: "u2", name: "Gym Center" }];

const meta = {
  title: "Páginas/Dinero/Punto de venta",
  component: PosView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Cada cajero abre su turno en una terminal; vende varias líneas con descuento, propina y pago mixto (el efectivo que se pasa es cambio) y cierra con arqueo. Funciona en celular y tablet. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", canManage: true, terminals: [{ id: "t1", name: "Mostrador 1", busy: false }, { id: "t2", name: "Sede norte", busy: true }], turn: null, products, categories, customers },
} satisfies Meta<typeof PosView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinTurno: Story = {};
export const SinTerminales: Story = { args: { terminals: [] } };
export const Vendiendo: Story = { args: { turn: { sessionId: "s1", terminalName: "Mostrador 1", openingAmount: 50_000 } } };

/** Un producto personalizable se vende «a medida»: nota de lo pedido y precio acordado en su renglón. */
export const ARenglonAMedida: Story = {
  args: { turn: { sessionId: "s1", terminalName: "Mostrador 1", openingAmount: 50_000 } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /^Camiseta personalizada/ }));
    await userEvent.click(c.getByRole("button", { name: "Personalizar Camiseta personalizada" }));
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.type(dialog.getByRole("textbox", { name: /Qué se pidió/ }), "Texto: Hola");
    await userEvent.click(dialog.getByRole("button", { name: "Aplicar" }));
    await expect(await c.findByText("Texto: Hola")).toBeVisible();
  },
};

/** Las categorías filtran el catálogo. */
export const FiltrandoPorCategoria: Story = {
  args: { turn: { sessionId: "s1", terminalName: "Mostrador 1", openingAmount: 50_000 } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Merchandising" }));
    await expect(c.queryByRole("button", { name: /^Proteína whey/ })).toBeNull();
    await expect(c.getByRole("button", { name: /^Camiseta personalizada/ })).toBeVisible();
  },
};
