import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DayMovementsSheet } from "./day-movements-sheet";

const meta = {
  title: "Organismos/Finanzas/DayMovementsSheet",
  component: DayMovementsSheet,
  args: { open: true, onOpenChange: () => undefined, title: "Lunes 12 oct.", fullHref: "/gym-norte/finance", state: { status: "loading" } },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DayMovementsSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Cargando: Story = {};
export const ConMovimientos: Story = {
  args: {
    state: {
      status: "ok",
      truncated: false,
      rows: [
        { id: "p1", type: "in", title: "Camila Torres", subtitle: "Mensualidad · Transferencia", amount: 120000, at: "2026-10-12T15:10:00Z" },
        { id: "p2", type: "in", title: "Venta de mostrador", subtitle: "Pago · Efectivo", amount: 35000, at: "2026-10-12T17:40:00Z" },
        { id: "e1", type: "out", title: "Aseo y limpieza", subtitle: "Insumos · Caja menor", amount: 18000, at: "2026-10-12T19:00:00Z" },
      ],
    },
  },
};
export const Vacio: Story = { args: { state: { status: "ok", rows: [], truncated: false } } };
export const ConError: Story = { args: { state: { status: "error", message: "Intenta de nuevo en un momento." } } };
