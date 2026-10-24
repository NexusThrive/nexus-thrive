import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import { DEFAULT_RULES, PUC_TEMPLATE } from "@/lib/accounting/puc";
import AccountingView from "./accounting-view";

const accounts = PUC_TEMPLATE.map((a, i) => ({ id: `a${i}`, ...a, active: a.code !== "1120" }));
const rules = DEFAULT_RULES.map((r, i) => ({ id: `r${i}`, event: r.event, name: r.name, active: true, lines: [...r.lines] }));

const entries = [
  { id: "e3", number: 3, date: "2026-10-24", description: "Cobro R-000045", event: "PAYMENT_RECEIVED", reversalOfId: null, reversed: false, lines: [{ account: "1110", debit: 238_000, credit: 0, label: "Caja o banco" }, { account: "1305", debit: 0, credit: 238_000, label: "Cliente" }] },
  { id: "e2", number: 2, date: "2026-10-24", description: "Costo de venta · Camiseta", event: "SALE_COST", reversalOfId: null, reversed: false, lines: [{ account: "6135", debit: 80_000, credit: 0, label: "Costo de ventas" }, { account: "1435", debit: 0, credit: 80_000, label: "Inventario" }] },
  { id: "e1", number: 1, date: "2026-10-24", description: "Venta V-000042", event: "SALE", reversalOfId: null, reversed: false, lines: [{ account: "1305", debit: 238_000, credit: 0, label: "Cliente" }, { account: "4135", debit: 0, credit: 200_000, label: "Ingreso por ventas (neto de descuentos)" }, { account: "2408", debit: 0, credit: 38_000, label: "IVA generado" }] },
];

const meta = {
  title: "Páginas/Finanzas/Contabilidad",
  component: AccountingView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Plan de cuentas (PUC) que trae cada negocio nuevo, reglas que dicen qué asiento genera cada hecho (se ven y se desactivan), centros de costo y sucursales, y cierre de meses en orden (reabrir exige motivo y lo hace el dueño). Plantilla de uso común: se confirma con el contador. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", accounts, rules, centers: [{ id: "c1", code: "ADM", name: "Administración", kind: "CENTER", active: true }, { id: "c2", code: "NORTE", name: "Sede norte", kind: "BRANCH", active: true }], periods: [{ year: 2026, month: 8, status: "CLOSED", closedAt: null }, { year: 2026, month: 9, status: "OPEN", closedAt: null }], entries, auto: true, today: "2026-10-24", canReopen: true },
} satisfies Meta<typeof AccountingView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinPlan: Story = { args: { accounts: [], rules: [] } };
export const SinAsientos: Story = { args: { entries: [], auto: false } };
