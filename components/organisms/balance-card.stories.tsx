import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { BalanceCard } from "./balance-card";

const meta = {
  title: "Organismos/Finanzas/BalanceCard",
  component: BalanceCard,
  decorators: [(Story) => <div className="max-w-[640px]"><Story /></div>],
  args: {
    label: "Balance · últimos 30 días",
    balance: 3_480_000,
    income: 5_210_000,
    expenses: 1_730_000,
    actions: (
      <>
        <Button variant="accent">Registrar pago</Button>
        <Button variant="outline" className="border-[#3A3A40] text-[#F7F6F3]">Registrar gasto</Button>
      </>
    ),
  },
} satisfies Meta<typeof BalanceCard>;
export default meta;

export const Positivo: StoryObj<typeof meta> = {};
export const Negativo: StoryObj<typeof meta> = { args: { balance: -420_000, income: 900_000, expenses: 1_320_000 } };
