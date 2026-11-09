import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import type { OpportunityRow } from "@/lib/business/growth/opportunities-db";
import OpportunitiesView from "./opportunities-view";

const row = (id: string, customerName: string, interest: string, extra: Partial<OpportunityRow> = {}): OpportunityRow => ({ id, customerId: `c${id}`, customerName, interest, estimatedValue: null, stage: "NEW", status: "OPEN", nextAction: null, nextActionAt: null, lostReason: null, source: "WEB", createdAt: "2026-11-01T12:00:00.000Z", ...extra });
const open = [
  row("1", "Camila Torres", "40 camisetas con logo para un evento", { estimatedValue: 1_600_000, stage: "QUOTED", nextAction: "Llamar para confirmar el diseño", nextActionAt: "2026-11-01T17:00:00.000Z" }),
  row("2", "Andrés Gómez", "Gorras bordadas", { stage: "CONTACTED", nextAction: "Enviar cotización", nextActionAt: "2099-01-01T17:00:00.000Z" }),
  row("3", "Laura Pérez", "Escribió desde el sitio"),
];

const meta = {
  title: "Páginas/Ventas/Oportunidades",
  component: OpportunitiesView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Cada interesado ligado a un contacto, con su etapa y siguiente paso. La acción vencida va primero. Ganar o perder no duplica a la persona; perder pide el motivo. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", open, won: [row("9", "Juan Ríos", "Uniformes", { status: "WON", stage: "NEGOTIATING", estimatedValue: 900_000 })], lost: [row("8", "Marta Díaz", "Pendones", { status: "LOST", lostReason: "Compró en otro lado" })], customers: [{ id: "c1", name: "Camila Torres" }, { id: "c2", name: "Andrés Gómez" }], today: "2026-11-07" },
} satisfies Meta<typeof OpportunitiesView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinOportunidades: Story = { args: { open: [] } };
