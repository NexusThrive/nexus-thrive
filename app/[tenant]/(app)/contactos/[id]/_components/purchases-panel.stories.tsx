import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PurchasesPanel from "./purchases-panel";

const meta = {
  title: "Páginas/Clientes/Productos comprados",
  component: PurchasesPanel,
  decorators: [(Story) => <div className="max-w-3xl p-5"><Story /></div>],
  parameters: { docs: { description: { component: "Pestaña de la ficha del cliente: qué productos compra, cuánto gasta, cada cuánto vuelve y cuándo se espera su próxima compra." } } },
  args: {
    saleHref: "/demo/ventas/cotizaciones?nuevo=1",
    purchases: {
      products: [
        { key: "a", name: "Proteína whey 2 lb", units: 4, spent: 400_000, times: 3, lastDate: "2026-10-12" },
        { key: "b", name: "Barra de proteína", units: 18, spent: 90_000, times: 5, lastDate: "2026-10-12" },
      ],
      orders: 5, spent: 490_000, firstDate: "2026-06-01", lastDate: "2026-10-12", averageGapDays: 31, nextExpected: "2026-11-12", returns: { count: 1, total: 100_000 },
    },
  },
} satisfies Meta<typeof PurchasesPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConCompras: Story = {};
export const SinCompras: Story = { args: { purchases: { products: [], orders: 0, spent: 0, firstDate: null, lastDate: null, averageGapDays: null, nextExpected: null, returns: { count: 0, total: 0 } } } };
