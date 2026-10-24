import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { computeMaturity } from "@/lib/presence/maturity";
import PresenceMaturity from "./presence-maturity";

const meta = {
  title: "Páginas/Visibilidad/Madurez NEXUS",
  component: PresenceMaturity,
  parameters: { layout: "padded", docs: { description: { component: "Fase B de Presencia: cuánto del negocio opera dentro de NEXUS (ventas, inventario, caja, clientes y gastos de los últimos 30 días), con una acción sugerida por cada señal débil. Solo aparece cuando la fase A está lista." } } },
  args: { slug: "demo", maturity: computeMaturity({ invoices30d: 8, productsActive: 24, stockMovements30d: 3, cashSessions30d: 20, customers: 40, customersWithPurchase30d: 14, expenses30d: 0 }) },
} satisfies Meta<typeof PresenceMaturity>;

export default meta;
type Story = StoryObj<typeof meta>;
export const ConSenales: Story = {};
export const Consolidado: Story = { args: { maturity: computeMaturity({ invoices30d: 40, productsActive: 30, stockMovements30d: 25, cashSessions30d: 25, customers: 80, customersWithPurchase30d: 40, expenses30d: 20 }) } };
