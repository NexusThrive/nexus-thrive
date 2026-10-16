import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import RecentActivity from "./recent-activity";

const meta = {
  title: "Organismos/RecentActivity",
  component: RecentActivity,
  args: {
    items: [
      { id: "1", type: "payment", title: "Pago mensualidad", description: "Laura Méndez · Tarjeta", amount: "$ 120.000", time: "Hace 5 min" },
      { id: "2", type: "expense", title: "Compra de cemento", description: "Caja menor · Obra Calle 80", amount: "-$ 845.000", time: "Hace 1 h" },
      { id: "3", type: "payment", title: "Anticipo cotización v2", description: "Inversiones Sabana · Transferencia", amount: "$ 15.780.000", time: "Ayer" },
      { id: "4", type: "expense", title: "Transporte de material", description: "Caja menor", amount: "-$ 210.000", time: "Ayer" },
    ],
  },
  decorators: [(Story) => <div className="max-w-lg"><Story /></div>],
  parameters: {
    docs: { description: { component: "Movimientos del negocio con filtro (`SegmentedControl`). Los gastos van en rojo; los ingresos en tinta." } },
  },
} satisfies Meta<typeof RecentActivity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithItems: Story = {};
export const Empty: Story = { args: { items: [] } };
