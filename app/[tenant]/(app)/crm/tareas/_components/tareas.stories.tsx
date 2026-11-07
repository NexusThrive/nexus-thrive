import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../../.storybook/decorators";
import type { TaskRow } from "@/lib/business/customers/tasks-db";
import TasksView from "./tasks-view";

const task = (id: string, title: string, extra: Partial<TaskRow> = {}): TaskRow => ({ id, title, notes: null, dueDay: "2026-11-09", assigneeId: "me", assigneeName: "Yo", customerId: null, customerName: null, projectId: null, projectName: null, status: "OPEN", overdue: false, createdAt: "2026-11-01T12:00:00.000Z", ...extra });
const mine = [
  task("1", "Llamar a Camila para confirmar el diseño", { dueDay: "2026-11-03", overdue: true, customerName: "Camila Torres" }),
  task("2", "Enviar la cotización de las gorras", { dueDay: "2026-11-07", customerName: "Andrés Gómez", projectId: "p1", projectName: "Campaña de marca" }),
  task("3", "Revisar el inventario de camisetas", { dueDay: null }),
];
const overdue = [mine[0]!, task("9", "Cobrar el saldo del pedido P-0040", { dueDay: "2026-11-01", overdue: true, assigneeId: "ana", assigneeName: "Ana Ruiz" })];

const meta = {
  title: "Páginas/Ventas/Tareas",
  component: TasksView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Un paso concreto con fecha y responsable. «Mis tareas» son las asignadas a ti; «Vencidas», las de todo el equipo; las vencidas también avisan en la campana. Cada tarea puede ligarse a un proyecto y filtrarse por proyecto y por persona. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", mine, overdue, all: [...mine, overdue[1]!], team: [{ id: "me", name: "Yo" }, { id: "ana", name: "Ana Ruiz" }], customers: [{ id: "c1", name: "Camila Torres" }], projects: [{ id: "p1", name: "Campaña de marca" }], today: "2026-11-07", me: "me" },
} satisfies Meta<typeof TasksView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinTareas: Story = { args: { mine: [], overdue: [], all: [] } };
