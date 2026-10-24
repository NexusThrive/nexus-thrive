import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import GrowthView from "./growth-view";

const links = [
  { id: "1", code: "k7m2p9x", name: "Instagram · lanzamiento de octubre", path: "", utmSource: "instagram", utmMedium: "social", utmCampaign: "octubre", spend: 200000, clicks: 120, active: true },
  { id: "2", code: "b3q8d4n", name: "Volantes con QR", path: "", utmSource: "volante", utmMedium: "impreso", utmCampaign: "barrio", spend: 80000, clicks: 31, active: false },
];
const rows = [
  { origin: { source: "instagram", medium: "social", campaign: "octubre" }, label: "instagram / social / octubre", spend: 200000, clicks: 120, leads: 3, orders: 2, revenue: 1000000, costPerLead: 66667, roas: 5 },
  { origin: { source: "directo", medium: "ninguno", campaign: "" }, label: "Directo", spend: 0, clicks: 0, leads: 1, orders: 1, revenue: 90000, costPerLead: null, roas: null },
];
const reviews = [
  { id: "r1", source: "INTERNAL", rating: 1, comment: "Llegó tarde mi pedido", customerName: "Pedro", contact: "3009998877", status: "ALERTED", createdAt: "2026-10-23T10:00:00.000Z" },
  { id: "r2", source: "INTERNAL", rating: 5, comment: "Excelente servicio", customerName: "Ana", contact: null, status: "NEW", createdAt: "2026-10-22T10:00:00.000Z" },
];

const meta = {
  title: "Páginas/Visibilidad/Campañas y reseñas",
  component: GrowthView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Enlaces cortos con UTM, reporte de inversión contra contactos y ventas por origen, y reseñas con alerta para las de 1–2 estrellas. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", baseUrl: "https://app.nexus.co", siteSlug: "simplapp", siteEnabled: true, links, report: { rows, totals: { spend: 200000, leads: 4, orders: 3, revenue: 1090000 } }, reviews, reputation: { average: 3.9, count: 23, alerts: 1 }, googlePlaceId: "ChIJdemo" },
} satisfies Meta<typeof GrowthView>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Enlaces: Story = {};
export const Vacio: Story = { args: { links: [], report: { rows: [], totals: { spend: 0, leads: 0, orders: 0, revenue: 0 } }, reviews: [], reputation: null, googlePlaceId: null, siteEnabled: false } };
