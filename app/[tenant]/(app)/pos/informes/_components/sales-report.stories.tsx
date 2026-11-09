import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SalesReportView from "./sales-report-view";

const meta = {
  title: "Páginas/Dinero/Informe de ventas",
  component: SalesReportView,
  decorators: [(Story) => <div className="p-5"><Story /></div>],
  parameters: { layout: "fullscreen", docs: { description: { component: "Informe de ventas del punto de venta por periodo: cifras, productos más vendidos, quién vendió y con qué medio pagaron." } } },
  args: {
    slug: "demo",
    report: {
      period: "7d", since: "2026-11-02T05:00:00.000Z", truncated: false, count: 42, total: 3_180_000, tips: 45_000, average: 75_714,
      topProducts: [{ key: "a", name: "Proteína whey 2 lb", units: 14, total: 1_400_000 }, { key: "b", name: "Barra de proteína", units: 62, total: 310_000 }],
      byCashier: [{ cashierId: "u1", count: 30, total: 2_300_000 }, { cashierId: "u2", count: 12, total: 880_000 }],
      byMethod: [{ method: "Efectivo", total: 1_900_000 }, { method: "Nequi", total: 1_280_000 }],
      cashiers: { u1: "Ana Gómez", u2: "Luis Pérez" },
    },
  },
} satisfies Meta<typeof SalesReportView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConVentas: Story = {};
export const SinVentas: Story = { args: { report: { period: "hoy", since: "2026-11-08T05:00:00.000Z", truncated: false, count: 0, total: 0, tips: 0, average: 0, topProducts: [], byCashier: [], byMethod: [], cashiers: {} } } };
export const MuchasVentas: Story = { args: { report: { ...meta.args.report, truncated: true } } };
