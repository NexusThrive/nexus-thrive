import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WelcomeChecklist, type WelcomeStep } from "./welcome-checklist";

const steps = (done: string[]): WelcomeStep[] =>
  [
    { id: "customer", icon: "customer", title: "Registra tu primer socio", description: "Agrega a tus contactos para llevar su historial, sus cobros y su seguimiento.", cta: "Nuevo socio", href: "/gym-norte/crm" },
    { id: "payment", icon: "payment", title: "Registra tu primer cobro", description: "Cobra y genera el comprobante para que tus ingresos queden al día.", cta: "Registrar pago", href: "/gym-norte/finance?nuevo=pago" },
    { id: "expense", icon: "expense", title: "Agrega tus gastos", description: "Anota los egresos de caja para conocer tu balance real.", cta: "Registrar gasto", href: "/gym-norte/finance?nuevo=gasto" },
    { id: "catalog", icon: "catalog", title: "Arma tu catálogo", description: "Define lo que vendes: precios, inventario y planes, para cobrar en un toque.", cta: "Agregar al catálogo", href: "/gym-norte/inventory?nuevo=1" },
  ].map((s) => ({ ...s, icon: s.icon as WelcomeStep["icon"], done: done.includes(s.id) }));

const meta = {
  title: "Organismos/WelcomeChecklist",
  component: WelcomeChecklist,
  args: { scope: "storybook-welcome", name: "Santiago", steps: steps([]) },
  argTypes: { steps: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          "Primeros pasos de una cuenta nueva en el inicio. A la izquierda la lista con el avance; a la derecha el detalle del paso elegido con un botón que lleva directo. Los pasos se marcan solos según los datos reales del negocio y solo aparecen los de los módulos activos (mínimo 2). «Ocultar» lo guarda en este navegador por negocio; con todos los pasos hechos el servidor deja de mostrarlo. Se puede mover u ocultar también desde «Editar diseño».",
      },
    },
  },
} satisfies Meta<typeof WelcomeChecklist>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewAccount: Story = {};
export const InProgress: Story = { args: { steps: steps(["customer", "payment"]) } };
export const TwoModules: Story = { args: { steps: steps([]).slice(0, 2) } };
