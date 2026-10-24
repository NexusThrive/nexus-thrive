import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import ProfileTab from "./profile-tab";

const meta = {
  title: "Páginas/Configuración/Perfil (lectura y edición)",
  component: ProfileTab,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Los datos se leen como información; «Modificar» abre un diálogo solo con el grupo que se edita. Se valida en el servidor, se conserva lo escrito si falla y un cambio de dirección del panel advierte que cambia el enlace. Las acciones son de muestra en Storybook: el slug «ocupado» y la ciudad «falla» simulan errores." } } },
  args: {
    tenantSlug: "demo",
    canManage: true,
    initialValues: { name: "Simplapp Gym", slug: "simplapp", city: "Bogotá", address: "Calle 80 # 12-34", taxId: "900123456-7", phone: "+57 3001234567" },
    systemInfo: [{ label: "Plan", value: "Pro" }, { label: "Creado", value: "12 de marzo de 2026" }],
    context: { vertical: "gym", businessModels: ["B2C"], activity: "" },
  },
} satisfies Meta<typeof ProfileTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SoloLectura: Story = { args: { canManage: false } };
export const SinDatos: Story = { args: { initialValues: { name: "Mi negocio", slug: "mi-negocio", city: "", address: "", taxId: "", phone: "" } } };
