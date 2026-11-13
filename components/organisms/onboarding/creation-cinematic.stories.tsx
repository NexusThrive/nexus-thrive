import { startTransition, useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CreationCinematic, type CinematicStatus } from "./creation-cinematic";
import { OnboardingScene } from "./onboarding-scene";

const meta = {
  title: "Organismos/Onboarding/CreationCinematic",
  component: CreationCinematic,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Cinemática al crear el negocio, con el tema activo. AURI (los ojos) crea el negocio hablando en su burbuja y poniendo cara de alegría; mientras carga, está en el centro exacto; al terminar la cámara retrocede (la N se aleja en profundidad y sube) y entra el texto. **Recorrido** muestra el paso de creando a listo; en Listo, pulsa Continuar para la bienvenida.",
      },
    },
  },
  args: { status: "creating", planName: "Elite", businessName: "Constructora Castellar", firstName: "Santiago", onEnter: () => {}, onBack: () => {} },
} satisfies Meta<typeof CreationCinematic>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Creando: Story = {};
export const Listo: Story = { args: { status: "ready" } };
export const ConError: Story = { args: { status: "error", error: "No se pudo crear tu espacio. Inténtalo de nuevo en un momento." } };

function Walkthrough(props: React.ComponentProps<typeof CreationCinematic>) {
  const [status, setStatus] = useState<CinematicStatus>("creating");
  useEffect(() => {
    const id = window.setTimeout(() => setStatus("ready"), 3000);
    return () => window.clearTimeout(id);
  }, []);
  return <CreationCinematic {...props} status={status} />;
}

/** Creando (3 s) → listo: el retroceso de cámara. */
export const Recorrido: Story = {
  args: {
    businessName: "NeoMarket"
  },

  render: (args) => <Walkthrough {...args} />
};

/** AURI viaja de su cuadro en el onboarding al centro de la pantalla de creación (View Transition compartida `nx-auri`). */
export const ViajeDeAuri: StoryObj<typeof CreationCinematic> = {
  render: function Viaje() {
    const [creating, setCreating] = useState(false);
    return (
      <div style={{ width: 560, minHeight: 560, display: "flex", flexDirection: "column", padding: 32, borderRadius: 32, background: "color-mix(in srgb, var(--accent) 10%, var(--card))" }}>
        <OnboardingScene mode="preview" step="confirm" auriHandoff={creating} preview={{ name: "GymTop", slug: "gymtop", vertical: "gym", city: "Medellín", tenantType: "COMPANY", modules: [] }} />
        <button type="button" onClick={() => startTransition(() => setCreating(true))} style={{ marginTop: 16 }}>Crear mi negocio</button>
        {creating ? <CreationCinematic status="creating" planName="Elite" businessName="GymTop" firstName="Santiago" onEnter={() => {}} onBack={() => setCreating(false)} /> : null}
      </div>
    );
  },
};
