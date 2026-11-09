import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../.storybook/decorators";
import SolutionsView from "./solutions-view";

const base = { source: "auto" as const, outside: [], doubtful: false, reasons: [], active: true };
const rows = [
  { ...base, id: "1", name: "Café del Parque", slug: "cafe", vertical: "hospitality", solution: "food" as const, doubtful: true, reasons: ["Su rubro puede ir en más de una solución según cómo opere."] },
  { ...base, id: "2", name: "Gym Norte", slug: "gym-norte", vertical: "gym", solution: "gym" as const, outside: ["construction" as const], doubtful: true, reasons: ["Usa una función que su solución no trae: construction."] },
  { ...base, id: "3", name: "Tienda Sol", slug: "sol", vertical: "retail", solution: "commerce" as const },
  { ...base, id: "4", name: "Club Náutico", slug: "club", vertical: "nautical_transport", solution: "business" as const, source: "manual" as const },
];

const meta = {
  title: "Páginas/Operations Center/Soluciones",
  component: SolutionsView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Solución de cada negocio (ADR 0007). Sale del rubro; los dudosos —rubros ambiguos o negocios que usan funciones de otra solución— van primero para revisarlos a mano. Cambiar la solución no mueve datos ni apaga funciones. Las acciones son de muestra en Storybook." } } },
  args: { rows, canEdit: true },
} satisfies Meta<typeof SolutionsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SoloLectura: Story = { args: { canEdit: false } };
export const SinPendientes: Story = { args: { rows: rows.filter((r) => !r.doubtful) } };
