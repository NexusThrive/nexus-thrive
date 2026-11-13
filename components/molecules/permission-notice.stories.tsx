import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PermissionNotice } from "./permission-notice";

const meta = {
  title: "Moléculas/Avisos y estados/PermissionNotice",
  id: "moléculas-permissionnotice",
  component: PermissionNotice,
  parameters: { layout: "padded" },
  args: { permission: "business.manage", action: "manejar los impuestos y la numeración" },
} satisfies Meta<typeof PermissionNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Los roles salen de la matriz de permisos: si el permiso cambia, el texto cambia con él (DR-34). */
export const SoloDuenoYAdministracion: Story = {};

export const TambienRecepcion: Story = { args: { permission: "money.handle", action: "manejar los cobros en línea" } };

export const SoloElDueno: Story = { args: { permission: "business.setup", action: "cambiar el plan y los módulos del negocio" } };
