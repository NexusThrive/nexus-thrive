import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import AccountTab from "./account-tab";

const meta = {
  title: "Páginas/Configuración/Mi cuenta",
  component: AccountTab,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Tus datos personales en el negocio: se leen como información y «Modificar» abre un diálogo con Guardar y Cancelar. El correo y el rol los administra el dueño. La acción es de muestra en Storybook." } } },
  args: { slug: "demo", me: { name: "Ana Gómez", email: "ana@ejemplo.com", roleLabel: "Dueño", title: "Administradora", phone: "+57 3001234567" } },
} satisfies Meta<typeof AccountTab>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const SinCompletar: Story = { args: { me: { name: "Luis", email: "luis@ejemplo.com", roleLabel: "Recepción", title: "", phone: "" } } };
