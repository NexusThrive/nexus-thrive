import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ToastProvider } from "@/components/molecules/toast";
import PriceListDetail from "./price-list-detail";

const meta = {
  title: "Páginas/Ventas/Lista de precios",
  component: PriceListDetail,
  decorators: [(Story) => <ToastProvider><div className="p-5"><Story /></div></ToastProvider>],
  parameters: { layout: "fullscreen", docs: { description: { component: "Una lista de precios: el precio de cada producto, los escalones por cantidad y a quién se aplica (grupos y clientes)." } } },
  args: {
    slug: "demo",
    list: { id: "mayorista", name: "Mayorista", isDefault: false, active: true, items: 2 },
    lines: [
      { productId: "p1", name: "Proteína whey 2 lb", sku: "WHEY", basePrice: 100_000, listPrice: 90_000 },
      { productId: "p2", name: "Barra de proteína", sku: "BAR", basePrice: 5_000, listPrice: null },
    ],
    tiers: { p2: [{ minQty: 10, price: 4_200 }] },
    groups: [{ id: "g1", name: "Gimnasios aliados", usesThis: true }, { id: "g2", name: "Colegios", usesThis: false }],
    assigned: [{ id: "u1", name: "Gym Center" }],
    customers: [{ id: "u1", name: "Gym Center" }, { id: "u2", name: "María Pérez" }],
  },
} satisfies Meta<typeof PriceListDetail>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConEscalonesYAsignaciones: Story = {};

/** Un escalón desde menos de 2 unidades se rechaza con su explicación. */
export const EscalonInvalido: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Precios por cantidad de Proteína whey 2 lb" }));
    const d = within(await within(document.body).findByRole("dialog"));
    await userEvent.click(d.getByRole("button", { name: /Agregar escalón/ }));
    await userEvent.clear(d.getByRole("textbox", { name: /Desde/ }));
    await userEvent.type(d.getByRole("textbox", { name: /Desde/ }), "1");
    await userEvent.type(d.getByRole("textbox", { name: /Precio por unidad/ }), "80000");
    await userEvent.click(d.getByRole("button", { name: "Guardar escalones" }));
    await expect(await d.findByText(/2 o más/)).toBeVisible();
  },
};
