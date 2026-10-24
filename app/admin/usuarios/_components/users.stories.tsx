import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../.storybook/decorators";
import UsersView from "./users-view";

const org = (name: string, role = "OWNER", extra: object = {}) => ({ tenantId: name, name, slug: name.toLowerCase().replace(/\s+/g, "-"), role, active: true, tenantActive: true, ...extra });
const users = [
  { email: "ana@ejemplo.com", name: "Ana Gómez", orgs: [org("Gimnasio Fuerza"), org("Tienda Ana"), org("Café Central", "ADMIN")], owned: 2, limit: 2, note: "Plan Signature, 2 sedes" },
  { email: "luis@ejemplo.com", name: "Luis Pardo", orgs: [org("Obras Pardo")], owned: 1, limit: null, note: null },
  { email: "nuevo@ejemplo.com", name: null, orgs: [], owned: 0, limit: 3, note: null },
];
const verticals = [{ value: "general", label: "General / Otro" }, { value: "gym", label: "Gimnasio" }, { value: "retail", label: "Tienda" }];

const meta = {
  title: "Operations Center/Usuarios",
  component: UsersView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Personas de la plataforma: cuántos negocios tiene cada una, su límite y la creación de un negocio para ella. Las acciones son de muestra en Storybook." } } },
  args: { users, total: 3, q: "", canEdit: true, canCreate: true, verticals },
} satisfies Meta<typeof UsersView>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Lista: Story = {};
export const SoloLectura: Story = { args: { canEdit: false, canCreate: false } };
export const SinResultados: Story = { args: { users: [], total: 0, q: "zzz" } };
