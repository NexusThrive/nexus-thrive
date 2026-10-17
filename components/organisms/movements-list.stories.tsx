import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MovementsList } from "./movements-list";

const now = Date.now();
const at = (h: number) => new Date(now - h * 3_600_000).toISOString();

const meta = {
  title: "Organismos/Finanzas/MovementsList",
  component: MovementsList,
  decorators: [(Story) => <div className="max-w-[760px]"><Story /></div>],
  args: {
    items: [
      { id: "1", type: "in", title: "Carlos Peña", subtitle: "Corte y barba · Nequi", amount: 55000, at: at(1) },
      { id: "2", type: "out", title: "Cuchillas y toallas", subtitle: "Insumos · Caja menor", amount: 82000, at: at(3) },
      { id: "3", type: "in", title: "Laura Gómez", subtitle: "Membresía Plata · Efectivo", amount: 89000, at: at(26) },
      { id: "4", type: "in", title: "Venta de mostrador", subtitle: "Pago · Transferencia", amount: 35000, at: at(52) },
    ],
  },
} satisfies Meta<typeof MovementsList>;
export default meta;

export const Movimientos: StoryObj<typeof meta> = {};
export const Vacio: StoryObj<typeof meta> = { args: { items: [] } };
