import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import CobrosView from "./cobros-view";

const row = (id: string, description: string, amount: number, status: "PENDING" | "PAID" | "EXPIRED", extra = {}) => ({ id, reference: `ref${id}abcdefghijk`, amount, description, status, channel: "LINK", provider: "sandbox", invoiceId: null, expiresAt: "2026-10-30T12:00:00.000Z", paidAt: null, confirmedBy: null, refundedTotal: 0, createdAt: "2026-10-24T12:00:00.000Z", ...extra });
const intents = [row("1", "Matrícula anual", 150_000, "PENDING"), row("2", "Mensualidad octubre", 80_000, "PAID", { confirmedBy: "PROVIDER" }), row("3", "Clase de prueba", 30_000, "EXPIRED")];

const meta = {
  title: "Páginas/Dinero/Cobros en línea",
  component: CobrosView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Enlaces y botones de pago con estado (pendiente, pagado, vencido). El ingreso solo se registra con el estado oficial: webhook de la pasarela o confirmación manual con evidencia. Reembolsos totales y parciales, y conciliación diaria contra el reporte del proveedor. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", baseUrl: "https://app.nexus.co", intents, runs: [{ id: "r1", provider: "sandbox", day: "2026-10-23", expected: 80_000, reported: 80_000, matched: 1, differences: [] }], canAdmin: true, today: "2026-10-24" },
} satisfies Meta<typeof CobrosView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinCobros: Story = { args: { intents: [] } };
export const SoloCrear: Story = { args: { canAdmin: false } };
