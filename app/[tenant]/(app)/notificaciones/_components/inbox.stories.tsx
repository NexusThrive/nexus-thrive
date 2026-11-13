import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToastProvider } from "@/components/molecules/toast";
import type { InboxItem } from "@/lib/experience/dashboard/inbox";
import InboxView, { type InboxActions } from "./inbox-view";

const at = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const sample: InboxItem[] = [
  { id: "t1", kind: "task", severity: "urgent", title: "2 tareas vencidas", detail: "Hazlas hoy o cámbiales la fecha", at: at(30), href: "/crm/tareas", read: false, archived: false },
  { id: "p1", kind: "payment", title: "Cobro registrado · $ 180.000", detail: "Laura Gómez · Efectivo", at: at(12), href: "/finanzas", read: false, archived: false },
  { id: "o1", kind: "order", severity: "action", title: "Pedido #1042 listo para entregar", detail: "Camila Ríos", at: at(95), href: "/ventas/pedidos", read: false, archived: false },
  { id: "b1", kind: "booking", title: "Cita hoy · Corte y barba", detail: "Santiago Ortiz", at: at(240), href: "/bookings", read: true, archived: false },
  { id: "e1", kind: "expense", title: "Gasto · $ 25.000", detail: "Café y azúcar para la oficina", at: at(60 * 27), href: "/finanzas", read: true, archived: false },
  { id: "c1", kind: "customer", title: "Nuevo cliente registrado · Daniela Vargas", detail: "Entró por el registro público.", at: at(60 * 30), href: "/contactos", read: false, archived: false },
  { id: "p2", kind: "payment", title: "Cobro registrado · $ 89.000", detail: "Carlos Peña · Nequi", at: at(60 * 24 * 4), href: "/finanzas", read: true, archived: false },
  { id: "x1", kind: "expense", title: "Gasto · $ 12.000", detail: "Archivado de ejemplo", at: at(60 * 24 * 6), href: "/finanzas", read: true, archived: true },
];
// Acciones de muestra: no guardan nada (los cambios se ven al instante en la lista).
const actions: InboxActions = { load: async () => sample, setRead: async () => {}, setArchived: async () => {} };

const meta = {
  title: "Páginas/Notificaciones/Buzón",
  component: InboxView,
  decorators: [(Story) => <ToastProvider><div className="p-6"><Story /></div></ToastProvider>],
  parameters: { layout: "fullscreen" },
  args: { slug: "demo", initial: sample, actions },
} satisfies Meta<typeof InboxView>;
export default meta;
type Story = StoryObj<typeof meta>;

/** El buzón con historial, sin leer, urgentes y una archivada. */
export const ConNotificaciones: Story = {};
/** Sin nada que mirar: «Todo al día». */
export const TodoAlDia: Story = { args: { initial: [] } };
