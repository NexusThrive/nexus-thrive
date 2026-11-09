import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { withShell } from "../../../../../.storybook/decorators";
import { buildConsumption } from "@/lib/core/entitlements/consumption";
import SettingsShell from "./settings-shell";

const usage = buildConsumption({
  seats: { used: 2, limit: 5 },
  customers: { used: 180, limit: 500 },
  meters: [{ meter: "api.requests", label: "Peticiones a la API y al MCP", used: 1_200, limit: 50_000, period: "2026-10" }],
});

const meta = {
  title: "Páginas/Configuración/Pantalla completa",
  component: SettingsShell,
  decorators: [withShell],
  parameters: { layout: "fullscreen", docs: { description: { component: "Configuración a todo el ancho: un resumen del negocio arriba, el menú de secciones a la izquierda y el contenido en dos columnas (Identidad y Contacto, Datos fiscales e Información del sistema). En celular el menú pasa a una fila deslizable." } } },
  args: {
    tenantSlug: "demo",
    canManage: true,
    profile: { name: "Simplapp Gym", slug: "demo", city: "Bogotá", address: "Calle 80 # 12-34", taxId: "900123456-7", phone: "+57 3001234567" },
    team: {
      members: [{ id: "u1", name: "Ana Gómez", email: "ana@ejemplo.com", role: "OWNER", title: "Administradora", phone: null, active: true, isMe: true } as never],
      invites: [],
      seats: { limit: 5, used: 1, planName: "Essential" },
      canManage: true,
      meRole: "OWNER",
    },
    systemInfo: [{ label: "Plan", value: "Essential" }, { label: "Creado", value: "12 de marzo de 2026" }],
    plan: { plan: "ESSENTIAL", billing: "MONTHLY", monthlyUsdCents: 0, selectedAt: null, activeModules: ["crm", "finance", "inventory"] as never[], access: null, usage },
    context: { vertical: "retail", businessModels: ["B2C"], activity: "" },
    me: { name: "Ana Gómez", email: "ana@ejemplo.com", roleLabel: "Dueño", title: "Administradora", phone: "+57 3001234567" },
  },
} satisfies Meta<typeof SettingsShell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Perfil: Story = {};
export const Equipo: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getAllByRole("button", { name: /Equipo y permisos/ })[0]!);
    await expect(await within(canvasElement).findByText("Ana Gómez")).toBeVisible();
  },
};
