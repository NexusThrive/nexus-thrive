import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OnboardingScene } from "./onboarding-scene";

const empty = { name: "", slug: "", vertical: null, city: "", tenantType: null, modules: [] };

const meta = {
  title: "Organismos/Onboarding/OnboardingScene",
  component: OnboardingScene,
  decorators: [(Story) => <div style={{ width: 520, minHeight: 640, display: "flex", flexDirection: "column", padding: 32, borderRadius: 32, background: "color-mix(in srgb, var(--accent) 10%, var(--card))" }}><Story /></div>],
  args: { mode: "preview", preview: empty },
} satisfies Meta<typeof OnboardingScene>;
export default meta;

export const Caos: StoryObj<typeof meta> = { args: { mode: "intro", introSlide: 0 } };
export const Orden: StoryObj<typeof meta> = { args: { mode: "intro", introSlide: 1 } };
export const PerfilEmpresa: StoryObj<typeof meta> = { args: { step: "profile", preview: { ...empty, tenantType: "COMPANY" } } };
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
        { module: "construction", price: "$19" },
      ],
    },
  },
};

/** El caso de «Gimnasio» con todos los módulos: la lista no sube sobre el texto de AURI. */
export const MuchosModulos: StoryObj<typeof meta> = {
  args: {
    step: "plan",
    preview: {
      name: "GymTop",
      slug: "gymtop",
      vertical: "gym",
      city: "Medellín",
      tenantType: "COMPANY",
      planName: "Elite",
      modules: (["crm", "bookings", "billing", "inventory", "finance", "dashboard", "whatsapp", "purchases", "pos", "receivables", "quotes"] as const).map((module) => ({ module, price: "Incluido" })),
    },
  },
};
