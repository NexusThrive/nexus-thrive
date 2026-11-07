import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../.storybook/decorators";
import { RecordBreadcrumbs } from "./record-breadcrumbs";

const meta = {
  title: "Organismos/Migas de registro",
  component: RecordBreadcrumbs,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Migas de un registro: «← Atrás» a su lista y «Clientes › María Pérez». En las fichas reemplaza a la miga por ruta." } } },
  args: { list: { label: "Clientes", href: "/demo/contactos" }, record: "María Pérez" },
} satisfies Meta<typeof RecordBreadcrumbs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ficha: Story = {};
export const NombreLargo: Story = { args: { record: "Restaurante y cafetería Los Almendros de la Avenida Norte" } };
