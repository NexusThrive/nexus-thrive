import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CreationCinematic, type CinematicStatus } from "./creation-cinematic";

const meta = {
  title: "Organismos/Onboarding/CreationCinematic",
  component: CreationCinematic,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Cinemática al crear el negocio, con el tema activo. Mientras carga, la N está en el centro exacto; al terminar la cámara retrocede (la N se aleja en profundidad y sube) y entra el texto. **Recorrido** muestra el paso de creando a listo; en Listo, pulsa Continuar para la bienvenida.",
      },
    },
  },
  args: { status: "creating", planName: "Elite", businessName: "Constructora Castellar", onEnter: () => {}, onBack: () => {} },
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
export const Recorrido: Story = { render: (args) => <Walkthrough {...args} /> };
