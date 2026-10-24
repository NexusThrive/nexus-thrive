import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import TaxesView from "./taxes-view";

const rate = (id: string, code: string, name: string, kind: "IVA" | "IMPOCONSUMO" | "RETEFUENTE" | "RETEIVA", ratePct: number, extra = {}) => ({ id, code, name, kind, ratePct, minBase: 0, validFrom: "2017-01-01", validTo: null, active: true, ...extra });
const rates = [
  rate("1", "IVA_19", "IVA 19 %", "IVA", 19),
  rate("2", "IVA_5", "IVA 5 %", "IVA", 5),
  rate("3", "IMPOCONSUMO_8", "Impoconsumo 8 %", "IMPOCONSUMO", 8, { active: false }),
  rate("4", "RETEFUENTE_SERVICIOS", "Retefuente servicios 4 %", "RETEFUENTE", 4, { minBase: 199_000 }),
  rate("5", "RETEIVA", "ReteIVA 15 %", "RETEIVA", 15),
  rate("6", "IVA_16", "IVA 16 % (anterior)", "IVA", 16, { validFrom: "2013-01-01", validTo: "2016-12-31" }),
];
const resolution = (id: string, extra: Record<string, unknown>) => ({ id, documentKind: "SALE", prefix: "SETP", resolutionNumber: "18760000001", rangeFrom: 1, rangeTo: 1000, nextNumber: 120, validFrom: "2026-01-01", validTo: "2027-06-30", active: true, status: { state: "ok" as const, remaining: 881, daysLeft: 250, warnings: [] }, ...extra });
const resolutions = [
  resolution("a", {}),
  resolution("b", { documentKind: "CREDIT_NOTE", prefix: "NC", resolutionNumber: "18760000002", rangeFrom: 1, rangeTo: 200, nextNumber: 185, status: { state: "ok" as const, remaining: 16, daysLeft: 20, warnings: ["Quedan 16 números del rango.", "La resolución vence en 20 días."] } }),
  resolution("c", { documentKind: "BILL", prefix: "", resolutionNumber: "18760000003", rangeFrom: 1, rangeTo: 500, nextNumber: 501, status: { state: "exhausted" as const, remaining: 0, daysLeft: 100, warnings: [], message: "Se agotó el rango 1–500. Registra la nueva resolución." } }),
];

const meta = {
  title: "Páginas/Finanzas/Impuestos y numeración",
  component: TaxesView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Parte de Finanzas, para cualquier rubro: tarifas de IVA, impoconsumo y retenciones con vigencia (la que rige el día del documento) y resoluciones de numeración con su rango, avisos de poco cupo o vencimiento y bloqueo cuando se agotan. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", rates, resolutions },
} satisfies Meta<typeof TaxesView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinTarifas: Story = { args: { rates: [], resolutions: [] } };
