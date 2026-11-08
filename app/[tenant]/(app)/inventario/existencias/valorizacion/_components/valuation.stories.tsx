import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ValuationView from "./valuation-view";

const meta = {
  title: "Páginas/Inventario/Valorización",
  component: ValuationView,
  decorators: [(Story) => <div className="p-5"><Story /></div>],
  parameters: { layout: "fullscreen", docs: { description: { component: "Cuánto vale el inventario a costo promedio: total, por categoría con su participación y los productos que más concentran." } } },
  args: {
    slug: "demo",
    valuation: {
      total: 4_720_000, units: 126, products: 9,
      byCategory: [{ category: "Suplementos", units: 86, value: 4_200_000, share: 89 }, { category: "Accesorios", units: 40, value: 520_000, share: 11 }],
      top: [{ productId: "a", name: "Proteína whey 2 lb", units: 40, value: 2_200_000, share: 46.6 }, { productId: "b", name: "Creatina 300 g", units: 30, value: 1_500_000, share: 31.8 }],
    },
  },
} satisfies Meta<typeof ValuationView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ConInventario: Story = {};
export const SinInventario: Story = { args: { valuation: { total: 0, units: 0, products: 0, byCategory: [], top: [] } } };
