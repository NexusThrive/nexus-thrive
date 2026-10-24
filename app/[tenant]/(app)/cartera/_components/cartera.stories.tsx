import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import { ageItems, balanceOf, bucketOf, daysOverdue } from "@/lib/receivables/aging";
import type { Cartera } from "@/lib/receivables/receivables-db";
import CarteraView from "./cartera-view";

const TODAY = "2026-10-24";
const make = (items: { id: string; party: string; number: string; dueDate: string | null; total: number; paid: number }[]): Cartera => {
  const rows = items.map((i) => ({ ...i, balance: balanceOf(i.total, i.paid), daysOverdue: daysOverdue(i.dueDate, TODAY), bucket: bucketOf(i.dueDate, TODAY) }));
  return { rows, aging: ageItems(rows, TODAY) };
};
const receivable = make([
  { id: "1", party: "Gimnasio Atlas", number: "CC-000012", dueDate: "2026-07-01", total: 1_200_000, paid: 0 },
  { id: "2", party: "María Pérez", number: "CC-000019", dueDate: "2026-10-01", total: 1_000_000, paid: 400_000 },
  { id: "3", party: "Consultoría Norte", number: "CC-000024", dueDate: "2026-11-15", total: 850_000, paid: 0 },
]);
const payable = make([
  { id: "p1", party: "Distribuidora Sur", number: "F-4521", dueDate: "2026-10-10", total: 2_400_000, paid: 1_000_000 },
  { id: "p2", party: "Insumos del Valle", number: "F-77", dueDate: null, total: 300_000, paid: 0 },
]);

const meta = {
  title: "Páginas/Finanzas/Cartera",
  component: CarteraView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Lo que te deben (cuentas de cobro con saldo) y lo que debes (facturas de proveedor), con el total por antigüedad. Un abono baja el saldo y, si lo salda, cierra la cuenta. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", receivable, payable },
} satisfies Meta<typeof CarteraView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SoloPorCobrar: Story = { args: { payable: null } };
export const SinCartera: Story = { args: { receivable: make([]), payable: make([]) } };
