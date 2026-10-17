import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OnboardingScene } from "./onboarding-scene";

const empty = { name: "", slug: "", vertical: null, city: "", tenantType: null, modules: [] };

const meta = {
  title: "Organismos/Onboarding/OnboardingScene",
  component: OnboardingScene,
  decorators: [(Story) => <div className="grid min-h-[560px] place-items-center bg-ink p-10"><Story /></div>],
  args: { mode: "preview", preview: empty },
} satisfies Meta<typeof OnboardingScene>;
export default meta;

export const Caos: StoryObj<typeof meta> = { args: { mode: "intro", introSlide: 0 } };
export const Orden: StoryObj<typeof meta> = { args: { mode: "intro", introSlide: 1 } };
export const VistaPreviaVacia: StoryObj<typeof meta> = {};
export const VistaPreviaCompleta: StoryObj<typeof meta> = {
  args: {
    preview: {
      name: "Constructora Castellar",
      slug: "constructora-castellar",
      vertical: "construction",
      city: "Cartagena",
      tenantType: "COMPANY",
      planName: "Elite",
      price: "58",
      modules: [
        { module: "dashboard", price: "Incluido" },
        { module: "crm", price: "Incluido" },
        { module: "quotes", price: "$19" },
      ],
    },
  },
};
