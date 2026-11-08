import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import KardexView from "./kardex-view";

const meta = {
  title: "Páginas/Inventario/Kardex",
  component: KardexView,
  decorators: [(Story) => <div className="p-5"><Story /></div>],
  parameters: { layout: "fullscreen", docs: { description: { component: "Kardex de un producto: cada movimiento con su costo unitario, su valor y el saldo que dejó." } } },
  args: {
    slug: "demo",
    products: [{ id: "p1", name: "Proteína whey 2 lb" }, { id: "p2", name: "Barra de proteína" }],
    selectedId: "p1",
    warehouses: [{ id: "w1", name: "Principal" }],
    lines: [
      { id: "k3", date: "2026-11-07T15:10:00.000Z", kind: "SALE", quantity: 2, unitCost: 55_000, value: 110_000, balance: 8, warehouseId: "w1", note: "Venta POS N.º 31", documentType: "SALE", documentId: "d1" },
      { id: "k2", date: "2026-11-05T14:00:00.000Z", kind: "IN", quantity: 6, unitCost: 55_000, value: 330_000, balance: 10, warehouseId: "w1", note: "Compra OC-0004", documentType: "PURCHASE", documentId: "o4" },
      { id: "k1", date: "2026-11-01T13:00:00.000Z", kind: "ADJUST", quantity: 4, unitCost: null, value: null, balance: 4, warehouseId: "w1", note: "Inventario inicial", documentType: null, documentId: null },
    ],
  },
} satisfies Meta<typeof KardexView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ConMovimientos: Story = {};
export const SinElegirProducto: Story = { args: { selectedId: null, lines: [] } };
export const ProductoSinMovimientos: Story = { args: { lines: [] } };
