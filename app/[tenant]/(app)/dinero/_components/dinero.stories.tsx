import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import type { MoneyOverview } from "@/lib/experience/dashboard/where-is-my-money";
import DineroView from "./dinero-view";

const overview: MoneyOverview = {
  days: 30,
  received: 4_820_000,
  byChannel: [
    { channel: "WOMPI", label: "Wompi (tarjeta, PSE)", received: 2_900_000, count: 21 },
    { channel: "TRANSFER", label: "Transferencia", received: 1_420_000, count: 9 },
    { channel: "CASH", label: "Efectivo", received: 500_000, count: 14 },
  ],
  receivable: { total: 1_940_000, count: 7, overdue: 2 },
  fees: { estimated: 112_400, real: 0 },
  inGateway: { net: 740_300, count: 6 },
  toVerify: { count: 2, amount: 285_000 },
  toReconcile: { proposed: 3, pending: 5 },
};

const meta = {
  title: "Páginas/Dinero/¿Dónde está mi dinero?",
  component: DineroView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Una sola vista del dinero: lo cobrado por canal, lo que te deben, lo que viene en camino a tu banco (neto de comisión) y lo que falta revisar. Solo lee de los motores de cobros, cartera, liquidaciones y extracto." } } },
  args: { slug: "demo", overview },
} satisfies Meta<typeof DineroView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TodoAlDia: Story = { args: { overview: { ...overview, receivable: { total: 0, count: 0, overdue: 0 }, toVerify: { count: 0, amount: 0 }, toReconcile: { proposed: 0, pending: 0 } } } };
export const SinMovimientos: Story = { args: { overview: { days: 30, received: 0, byChannel: [], receivable: { total: 0, count: 0, overdue: 0 }, fees: { estimated: 0, real: 0 }, inGateway: { net: 0, count: 0 }, toVerify: { count: 0, amount: 0 }, toReconcile: { proposed: 0, pending: 0 } } } };
export const NombresLargos: Story = { args: { overview: { ...overview, byChannel: [{ channel: "X", label: "Transferencia desde una cuenta empresarial con un nombre muy largo que debe partir línea", received: 12_345_678_900, count: 1200 }], received: 12_345_678_900 } } };
