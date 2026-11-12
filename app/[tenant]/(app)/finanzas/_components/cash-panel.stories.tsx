import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToastProvider } from "@/components/molecules/toast";
import CashPanel from "./cash-panel";

const open = { id: "s1", openedAt: "2026-11-12T13:00:00.000Z", openingAmount: 300000, expected: 262500 };
const box = { id: "b1", name: "Caja principal", fundAmount: 300000, responsibleUserId: "u1", openSession: open };

const meta = {
  title: "Páginas/Finanzas/Caja menor",
  component: CashPanel,
  parameters: { layout: "padded" },
  decorators: [(Story) => <ToastProvider><Story /></ToastProvider>],
  args: {
    slug: "demo",
    boxes: [box],
    members: [{ id: "u1", name: "Santiago Ortiz" }],
    canManage: true,
    moves: [
      { id: "m1", kind: "EXPENSE", amount: 25000, description: "Café y azúcar para la oficina", beneficiary: null, createdAt: "2026-11-12T14:10:00.000Z" },
      { id: "m2", kind: "VOUCHER", amount: 20000, description: "Taxi a la notaría", beneficiary: "Camila Ríos", createdAt: "2026-11-12T15:30:00.000Z" },
      { id: "m3", kind: "INCOME", amount: 7500, description: "Cobro en efectivo · Colegio San José", beneficiary: null, createdAt: "2026-11-12T16:02:00.000Z" },
    ],
    history: [
      { id: "h1", openedAt: "2026-11-10T13:00:00.000Z", closedAt: "2026-11-10T23:00:00.000Z", expected: 280000, counted: 280000, difference: 0, notes: null },
      { id: "h2", openedAt: "2026-11-09T13:00:00.000Z", closedAt: "2026-11-09T23:00:00.000Z", expected: 295000, counted: 290000, difference: -5000, notes: "Faltó un vale sin soporte" },
    ],
  },
} satisfies Meta<typeof CashPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TurnoAbierto: Story = {};
export const TurnoAbiertoSinMovimientos: Story = { args: { moves: [], history: [] } };
export const Cerrada: Story = { args: { boxes: [{ ...box, openSession: null }], moves: [] } };
export const SinCaja: Story = { args: { boxes: [], moves: [], history: [] } };
