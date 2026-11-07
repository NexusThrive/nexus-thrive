import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import { ProductionBoard } from "./production-board";

const row = (n: number, stage: "QUEUED" | "IN_PROGRESS" | "DONE") => ({ id: `p${n}`, orderId: `o${n}`, orderCode: `T-000${n}`, productName: n % 2 ? "Camiseta estampada" : "Gorra bordada", quantity: n + 1, stage, assigneeId: null, note: null });

const meta = {
  title: "Páginas/Ventas/Producción",
  component: ProductionBoard,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Órdenes de producción, una por línea de pedido, con etapas mínimas (en cola, en curso, terminada). Un toque avanza la etapa; al terminar la última de un pedido, el pedido pasa a «listo»." } } },
  args: { slug: "demo", rows: [row(1, "QUEUED"), row(2, "IN_PROGRESS"), row(3, "QUEUED")] },
} satisfies Meta<typeof ProductionBoard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Vacio: Story = { args: { rows: [] } };
