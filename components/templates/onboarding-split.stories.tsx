import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { OnboardingScene } from "@/components/organisms/onboarding/onboarding-scene";
import { OnboardingSplit } from "./onboarding-split";

const meta = {
  title: "Plantillas/OnboardingSplit",
  component: OnboardingSplit,
  parameters: { layout: "fullscreen" },
  args: {
    steps: ["Perfil", "Tu negocio", "Plan y módulos", "Confirmación"],
    current: 2,
    stepKey: "business",
    title: "Cuéntanos de tu negocio",
    description: "Con esto armamos tu espacio y tu enlace en NEXUS.",
    onBack: () => {},
    scene: (
      <OnboardingScene
        mode="preview"
        preview={{ name: "Barbería El Caballero", slug: "el-caballero", vertical: "beauty", city: "Medellín", tenantType: "INDIVIDUAL", modules: [] }}
      />
    ),
    actions: <><span className="flex-1" /><Button size="lg">Continuar</Button></>,
    children: <div className="h-64 rounded-lg border border-dashed border-border" />,
  },
} satisfies Meta<typeof OnboardingSplit>;
export default meta;

export const Escritorio: StoryObj<typeof meta> = {};
export const Movil: StoryObj<typeof meta> = { globals: { viewport: { value: "mobile1" } } };
