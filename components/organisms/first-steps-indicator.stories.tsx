import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FirstStepsIndicator, type WelcomeStep } from "./first-steps-indicator";

const steps = (done: string[]): WelcomeStep[] =>
  [
    { id: "customer", icon: "customer", title: "Registra tu primer socio", description: "Agrega a tus contactos para llevar su historial, sus cobros y su seguimiento.", cta: "Nuevo socio", href: "/gym-norte/crm" },
    { id: "payment", icon: "payment", title: "Registra tu primer cobro", description: "Cobra y genera el comprobante para que tus ingresos queden al día.", cta: "Registrar pago", href: "/gym-norte/finance?nuevo=pago" },
    { id: "expense", icon: "expense", title: "Agrega tus gastos", description: "Anota los egresos de caja para conocer tu balance real.", cta: "Registrar gasto", href: "/gym-norte/finance?nuevo=gasto" },
    { id: "catalog", icon: "catalog", title: "Arma tu catálogo", description: "Define lo que vendes: precios, inventario y planes, para cobrar en un toque.", cta: "Agregar al catálogo", href: "/gym-norte/inventory?nuevo=1" },
  ].map((s) => ({ ...s, icon: s.icon as WelcomeStep["icon"], done: done.includes(s.id) }));

const meta = {
  title: "Organismos/FirstStepsIndicator",
  component: FirstStepsIndicator,
  args: { steps: steps([]) },
  argTypes: { steps: { control: false } },
  decorators: [(Story) => <div className="flex justify-end p-6"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component:
          "Primeros pasos de una cuenta nueva, en la barra superior: un círculo con «!» y un anillo con un tramo por paso (relleno en oro el hecho, de rayas el pendiente). Al pulsarlo se abre la lista en orden, con el siguiente paso destacado y su botón. Los pasos se marcan solos según los datos reales del negocio y solo aparecen los de los módulos activos (mínimo 2). Con todos hechos desaparece.",
      },
    },
  },
} satisfies Meta<typeof FirstStepsIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewAccount: Story = {};
export const InProgress: Story = { args: { steps: steps(["customer", "payment"]) } };
export const TwoModules: Story = { args: { steps: steps([]).slice(0, 2) } };
export const AlmostDone: Story = { args: { steps: steps(["customer", "payment", "expense"]) } };
