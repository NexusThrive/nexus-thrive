import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ModuleSuggestions } from "./module-suggestions";

const meta = {
  title: "Organismos/Inicio/ModuleSuggestions",
  id: "organismos-modulesuggestions",
  component: ModuleSuggestions,
  args: { suggestedIds: ["crm", "bookings", "finance", "memberships", "inventory"], activeModules: ["crm"], functionsHref: "/gym-norte/functions" },
  decorators: [(Story) => <div className="max-w-xl p-6"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component:
          "Bloque del inicio que sugiere los módulos de la receta del rubro que el negocio aún no tiene encendidos (hasta tres), con qué hacen y un enlace a Funciones. Si no hay nada que sugerir, no pinta nada.",
      },
    },
  },
} satisfies Meta<typeof ModuleSuggestions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NadaQueSugerir: Story = { args: { activeModules: ["crm", "bookings", "finance", "memberships", "inventory"] } };
