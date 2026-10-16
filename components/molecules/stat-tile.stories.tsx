import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatTile } from "./stat-tile";

const meta = {
  title: "Moléculas/StatTile",
  component: StatTile,
  args: { label: "Activas", value: 42, tone: "success", note: "Con más de 3 días de vigencia" },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Row: Story = {
  decorators: [(Story) => <div className="max-w-none"><Story /></div>],
  render: () => (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <StatTile label="Activas" value={42} tone="success" note="Con más de 3 días de vigencia" />
      <StatTile label="Por vencer" value={6} tone="warning" pulse note="En los próximos 3 días" index={1} />
      <StatTile label="Vencidas" value={4} tone="danger" note="Pendientes de renovación" index={2} />
      <StatTile label="Renovaciones" value="$ 1.284.000" note="Valor por cobrar este mes" index={3} />
    </div>
  ),
};
