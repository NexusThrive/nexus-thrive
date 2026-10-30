import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import RecentActivity from "./recent-activity";

const meta = {
  title: "Organismos/RecentActivity",
  component: RecentActivity,
  args: {
    items: [
      { id: "1", type: "payment", title: "Pago mensualidad", description: "Laura Méndez · Tarjeta", amount: "$ 120.000", time: "Hace 5 min" },
      { id: "2", type: "expense", title: "Compra de cemento", description: "Caja menor · Obra Calle 80", amount: "$ 845.000", time: "Hace 1 h" },
      { id: "3", type: "payment", title: "Anticipo cotización v2", description: "Inversiones Sabana · Transferencia", amount: "$ 15.780.000", time: "Ayer" },
      { id: "4", type: "expense", title: "Transporte de material", description: "Caja menor", amount: "$ 210.000", time: "Ayer" },
    ],
  },
  decorators: [(Story) => <div className="max-w-lg"><Story /></div>],
  parameters: {
    docs: { description: { component: "Actividad del negocio con filtros por tipo (chips con conteo) según los módulos activos: pagos, gastos, socios nuevos, vencimientos y cuentas pendientes. Cada fila lleva al registro de su dato y el pie, al registro completo. Los gastos van en rojo; los ingresos en tinta." } },
  },
} satisfies Meta<typeof RecentActivity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithItems: Story = {};
export const Empty: Story = { args: { items: [] } };

const mixed = [
  { id: "p1", type: "pending", title: "Inversiones Sabana", description: "CC-000012 · 12 días de mora", amount: "$ 4.200.000", time: "Vence 2026-10-04", href: "/gym-norte/cartera" },
  { id: "x1", type: "expiry", title: "Laura Méndez", description: "Membresía mensual por vencer", amount: "", time: "En 2 días", href: "/gym-norte/memberships" },
  { id: "1", type: "payment", title: "Pago mensualidad", description: "Laura Méndez · Tarjeta", amount: "$ 120.000", time: "Hace 5 min", href: "/gym-norte/finance" },
  { id: "c1", type: "customer", title: "Andrés Gómez", description: "Nuevo socio", amount: "", time: "Hace 2 h", href: "/gym-norte/crm/abc" },
  { id: "2", type: "expense", title: "Compra de insumos", description: "Caja menor", amount: "$ 85.000", time: "Ayer", href: "/gym-norte/finance" },
] as const;

/** Con filtros por tipo, enlaces a cada registro y «Ver registro completo». */
export const ConFiltros: Story = {
  args: {
    items: [...mixed],
    filters: [
      { type: "payment", label: "Pagos" },
      { type: "expense", label: "Gastos" },
      { type: "customer", label: "Socios" },
      { type: "expiry", label: "Vencimientos" },
      { type: "pending", label: "Pendientes" },
    ],
    registry: {
      all: { href: "/gym-norte/finance", label: "Ver registro completo" },
      customer: { href: "/gym-norte/crm", label: "Ver socios" },
      pending: { href: "/gym-norte/cartera", label: "Ver la cartera" },
    },
  },
};

/** Un filtro sin datos dice por qué está vacío. */
export const FiltroVacio: Story = {
  args: { ...ConFiltros.args, items: mixed.filter((i) => i.type !== "expiry") },
};
