import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../../.storybook/decorators";
import type { QuoteRow } from "@/lib/business/sales/sales-quotes-db";
import QuotesView from "./quotes-view";

const quote = (n: number, title: string, status: QuoteRow["status"], extra: Partial<QuoteRow> = {}): QuoteRow => ({ id: `q${n}`, number: n, title, customerId: "c1", customerName: "Camila Torres", status, total: 1_600_000, depositPct: 50, validUntil: "2026-11-30", orderId: null, decisionNote: null, lines: [{ name: "Camiseta con logo", quantity: 40, unitPrice: 40_000 }], createdAt: "2026-11-01T12:00:00.000Z", ...extra });

const meta = {
  title: "Páginas/Ventas/Cotizaciones",
  component: QuotesView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Cotizaciones comerciales con el catálogo. Aprobar una crea el pedido y deja el anticipo y el saldo en la cartera; una vencida no se aprueba. Las acciones son de muestra en Storybook." } } },
  args: {
    slug: "demo",
    quotes: [quote(3, "Camisetas con logo para el evento", "SENT"), quote(2, "Gorras bordadas", "DRAFT", { validUntil: "2026-10-01" }), quote(1, "Uniformes", "APPROVED", { orderId: "o1" }), quote(4, "Pendones", "REJECTED", { decisionNote: "Compró en otro lado" })],
    customers: [{ id: "c1", name: "Camila Torres" }],
    products: [{ id: "p1", name: "Camiseta con logo", price: 40_000 }, { id: "p2", name: "Gorra bordada", price: 25_000 }],
    today: "2026-11-07",
  },
} satisfies Meta<typeof QuotesView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinCotizaciones: Story = { args: { quotes: [] } };
