import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import { DEFAULT_RULES, PUC_TEMPLATE } from "@/lib/accounting/puc";
import AccountingView from "./accounting-view";

const accounts = PUC_TEMPLATE.map((a, i) => ({ id: `a${i}`, ...a, active: a.code !== "1120" }));
const rules = DEFAULT_RULES.map((r, i) => ({ id: `r${i}`, event: r.event, name: r.name, active: true, lines: [...r.lines] }));

const meta = {
  title: "Páginas/Finanzas/Contabilidad",
  component: AccountingView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Plan de cuentas (PUC) que trae cada negocio nuevo, reglas que dicen qué asiento genera cada hecho (se ven y se desactivan), centros de costo y sucursales, y cierre de meses en orden (reabrir exige motivo y lo hace el dueño). Plantilla de uso común: se confirma con el contador. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", accounts, rules, centers: [{ id: "c1", code: "ADM", name: "Administración", kind: "CENTER", active: true }, { id: "c2", code: "NORTE", name: "Sede norte", kind: "BRANCH", active: true }], periods: [{ year: 2026, month: 8, status: "CLOSED", closedAt: null }, { year: 2026, month: 9, status: "OPEN", closedAt: null }], today: "2026-10-24", canReopen: true },
} satisfies Meta<typeof AccountingView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinPlan: Story = { args: { accounts: [], rules: [] } };
