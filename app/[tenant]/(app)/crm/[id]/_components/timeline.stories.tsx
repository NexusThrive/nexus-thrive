import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { CustomerTimelineEvent } from "@/lib/core/tenancy/db";
import TimelinePanel from "./timeline";

const events: CustomerTimelineEvent[] = [
  { id: "1", type: "payment", date: "2026-11-07T15:00:00.000Z", title: "Cobro · Pedido T-0042", amount: 140_000, status: "Pagado" },
  { id: "2", type: "order", date: "2026-11-06T15:00:00.000Z", title: "Pedido T-0042", description: "Nació de una cotización aprobada", amount: 140_000, status: "Pagado" },
  { id: "3", type: "quote", date: "2026-11-05T15:00:00.000Z", title: "Cotización COT-0003 · Camisetas con logo", amount: 160_000, status: "Aprobada" },
  { id: "4", type: "opportunity", date: "2026-11-02T15:00:00.000Z", title: "Oportunidad · 40 camisetas para un evento", description: "Siguiente: llamar para confirmar el diseño", amount: 1_600_000, status: "Cotizado" },
  { id: "5", type: "task", date: "2026-11-02T14:00:00.000Z", title: "Tarea · Llamar a Camila", description: "Para el 2026-11-04", status: "Pendiente" },
  { id: "6", type: "document", date: "2026-11-01T14:00:00.000Z", title: "Cuenta de cobro N.º 12", amount: 300_000, status: "Emitido" },
  { id: "7", type: "note", date: "2026-10-30T14:00:00.000Z", title: "Nota", description: "Prefiere que la llamen por la tarde." },
];

const meta = {
  title: "Páginas/Clientes/Ficha única · Línea de tiempo",
  component: TimelinePanel,
  parameters: { layout: "padded", docs: { description: { component: "Todo lo de un cliente en una sola línea de tiempo: pagos, membresías, notas, oportunidades, cotizaciones, pedidos, tareas y documentos, del más reciente al más antiguo. Las conversaciones llegan con el WhatsApp propio del negocio." } } },
  args: { events, emptyText: "Sin actividad registrada para este cliente." },
} satisfies Meta<typeof TimelinePanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Vacia: Story = { args: { events: [] } };
