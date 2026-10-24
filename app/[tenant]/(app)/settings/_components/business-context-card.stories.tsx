import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import BusinessContextCard from "./business-context-card";

const meta = {
  title: "Páginas/Configuración/Perfil del negocio",
  component: BusinessContextCard,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "El perfil es contexto: da el vocabulario y las sugerencias, pero no limita funciones. «General / Otro» sirve para agencias, consultoras, empresas B2B o negocios mixtos; el modelo comercial (B2B, B2C, B2B2C) se elige por separado y se pueden combinar." } } },
  args: { slug: "demo", canManage: true, initial: { vertical: "general", businessModels: ["B2B"], activity: "Agencia de marketing para pymes" } },
} satisfies Meta<typeof BusinessContextCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const General: Story = {};
export const Gimnasio: Story = { args: { initial: { vertical: "gym", businessModels: ["B2C"], activity: "" } } };
export const SoloLectura: Story = { args: { canManage: false } };
