import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import { buildConsumption } from "@/lib/usage/consumption";
import PlanTab from "./plan-tab";

const usage = (seats: number, customers: number | null, api: number) =>
  buildConsumption({
    seats: { used: seats, limit: 5 },
    customers: { used: 180, limit: customers },
    meters: [
      { meter: "api.requests", label: "Peticiones a la API y al MCP", used: api, limit: 50_000, period: "2026-10" },
      { meter: "messages.sent", label: "Mensajes enviados", used: 120, limit: 5_000, period: "2026-10" },
    ],
  });
const base = { plan: "ESSENTIAL" as const, billing: "MONTHLY" as const, monthlyUsdCents: 0, selectedAt: null, activeModules: ["crm", "finance", "inventory"] as never[], access: null };

const meta = {
  title: "Páginas/Configuración/Plan y consumo",
  component: PlanTab,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "El plan limita uso (equipo, clientes y consumo del mes), no funciones. Cada límite muestra su barra; al 80 % avisa y al llegar al tope lo dice. «Sin límite acordado» cuando no hay tope." } } },
  args: { info: { ...base, usage: usage(2, null, 1_200) } },
} satisfies Meta<typeof PlanTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CercaDelLimite: Story = { args: { info: { ...base, usage: usage(4, 200, 41_000) } } };
export const LimiteAlcanzado: Story = { args: { info: { ...base, usage: usage(5, 180, 50_000) } } };
