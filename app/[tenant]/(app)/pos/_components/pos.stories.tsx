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

/** Los medios son los del negocio: aquí ofrece Nequi, y sus instrucciones salen al elegirlo. */
export const ConMediosDelNegocio: Story = {
  args: {
    turn: { sessionId: "s1", terminalName: "Mostrador 1", openingAmount: 50_000 },
    methods: [
      { id: "m1", kind: "CASH", name: "Efectivo", instructions: null, active: true, position: 0 },
      { id: "m2", kind: "TRANSFER", name: "Nequi", instructions: "Cel. 300 123 4567", active: true, position: 1 },
    ],
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("combobox", { name: "Medio de pago 1" }));
    await userEvent.click(await within(document.body).findByRole("option", { name: "Nequi" }));
    await expect(c.getByText("Cel. 300 123 4567")).toBeVisible();
  },
};

/** Al elegir un cliente con lista de precios, el catálogo y el carrito usan sus precios (y los escalones por cantidad). */
export const ClienteConListaDePrecios: Story = {
  args: { turn: { sessionId: "s1", terminalName: "Mostrador 1", openingAmount: 50_000 } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("combobox", { name: "Cliente (opcional)" }));
    await userEvent.click(await within(document.body).findByRole("option", { name: "Gym Center" }));
    await expect(await c.findByText(/\$\s?4\.000/)).toBeVisible();
  },
};

/** Un medio a crédito exige elegir el cliente: lo que debe queda en su cartera. */
export const VentaACredito: Story = {
  args: {
    turn: { sessionId: "s1", terminalName: "Mostrador 1", openingAmount: 50_000 },
    methods: [
      { id: "m1", kind: "CASH", name: "Efectivo", instructions: null, active: true, position: 0 },
      { id: "m3", kind: "CREDIT", name: "Fiado", instructions: null, active: true, position: 1 },
    ],
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /^Agua/ }));
    await userEvent.click(c.getByRole("combobox", { name: "Medio de pago 1" }));
    await userEvent.click(await within(document.body).findByRole("option", { name: "Fiado" }));
    await userEvent.type(c.getByRole("textbox", { name: "Valor del pago 1" }), "3000");
    await expect(await c.findByText(/elige el cliente/)).toBeVisible();
    await expect(c.getByRole("button", { name: /Cobrar/ })).toBeDisabled();
  },
};

/** Sin internet la venta se guarda en el dispositivo; al volver la conexión se envía sola. */
export const SinConexion: Story = {
  args: { turn: { sessionId: "s1", terminalName: "Mostrador 1", openingAmount: 50_000 } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    window.localStorage.clear();
    const online = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine");
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    await userEvent.click(c.getByRole("button", { name: /^Agua/ }));
    await userEvent.type(c.getByRole("textbox", { name: "Valor del pago 1" }), "3000");
    await userEvent.click(c.getByRole("button", { name: /Cobrar/ }));
    await expect(await c.findByText("1 venta sin enviar")).toBeVisible();
    // Vuelve la conexión: se envía sola.
    delete (navigator as { onLine?: boolean }).onLine;
    if (online) Object.defineProperty(Navigator.prototype, "onLine", online);
    window.dispatchEvent(new Event("online"));
    await expect(await within(document.body).findByText(/Venta sin conexión enviada/)).toBeVisible();
  },
};
