import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CreationCinematic } from "./creation-cinematic";

const meta = {
  title: "Organismos/Onboarding/CreationCinematic",
  component: CreationCinematic,
  parameters: { layout: "fullscreen" },
  args: { status: "creating", planName: "Elite", businessName: "Constructora Castellar", onEnter: () => {}, onBack: () => {} },
} satisfies Meta<typeof CreationCinematic>;
export default meta;

export const Creando: StoryObj<typeof meta> = {};
export const Listo: StoryObj<typeof meta> = { args: { status: "ready" } };
export const ConError: StoryObj<typeof meta> = { args: { status: "error", error: "No se pudo crear tu espacio. Inténtalo de nuevo en un momento." } };
