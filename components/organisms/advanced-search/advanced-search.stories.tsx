import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ToastProvider } from "@/components/molecules/toast";
import { customerSearchDefs } from "@/lib/business/customers/customer-search";
import { toSchema } from "@/lib/foundation/list-search";
import AdvancedSearch from "./advanced-search";

const schema = toSchema(
  customerSearchDefs({
    groups: [
      { id: "g1", name: "Clientes VIP", icon: "crown" },
      { id: "g2", name: "Ruta norte", icon: "map-pin" },
    ],
    owners: [{ id: "o1", name: "Ana Ruiz" }],
    rows: [],
  }),
);

const ok = async () => ({ ok: true as const });
const acciones = { guardar: ok, renombrar: ok, eliminar: ok, fijar: ok };

/**
 * Buscador avanzado compartido por todas las listas: barra con chips y panel «Buscar en · Filtros · Agrupar por · Favoritos».
 * El estado vive en la URL; aquí las acciones son de muestra.
 */
const meta = {
  title: "Organismos/Buscador avanzado",
  component: AdvancedSearch,
  decorators: [
    (Story) => (
      <ToastProvider>
        <div className="mx-auto w-full max-w-[543px] p-6">
          <Story />
        </div>
      </ToastProvider>
    ),
  ],
  parameters: { layout: "fullscreen" },
  args: {
    etiqueta: "Buscar clientes",
    esquema: schema,
    favoritos: [
      { id: "f1", name: "Clientes VIP", isDefault: false, params: { filtros: "activos" } },
      { id: "f2", name: "Por cobrar este mes", isDefault: true, params: { filtros: "saldo,este-mes" } },
    ],
    conteos: async () => ({ activos: 5, archivados: 0, "cita-proxima": 1, saldo: 2, "sin-visitas-90": 0, personas: 4, empresas: 1, "este-mes": 5 }),
    acciones,
  },
} satisfies Meta<typeof AdvancedSearch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Cerrado: Story = {};

export const PanelAbierto: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Filtros, agrupar y favoritos" }));
    const panel = await within(document.body).findByRole("dialog", { name: "Filtros, agrupar y favoritos" });
    await expect(within(panel).getByText("Buscar en")).toBeVisible();
    await expect(within(panel).getByRole("button", { name: "Activos" })).toHaveAttribute("aria-pressed", "true");
  },
};

export const SinFavoritos: Story = {
  args: { favoritos: [] },
  play: PanelAbierto.play,
};
