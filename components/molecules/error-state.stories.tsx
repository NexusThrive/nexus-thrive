import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ErrorState } from "./error-state";

const meta = {
  title: "Moléculas/Avisos y estados/ErrorState",
  id: "moléculas-errorstate",
  component: ErrorState,
  parameters: { layout: "fullscreen" },
  args: { onRetry: () => undefined },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Error de una pantalla completa (`error.tsx`): reintentar y una salida. */
export const Default: Story = {
  args: {
    reference: "3187920412",
    action: (
      <a href="#inicio" className={buttonVariants({ variant: "outline" })}>
        Ir al inicio
      </a>
    ),
  },
};

/** Sin referencia ni salida alternativa. */
export const Minimo: Story = {};

/** Un bloque de una página que sigue funcionando (p. ej. una gráfica). */
export const Bloque: Story = {
  args: {
    variant: "block",
    headingLevel: 3,
    title: "No pudimos cargar los ingresos",
    description: "El resto de la pantalla sigue disponible. Reintenta para volver a pedir este bloque.",
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-2xl p-4">
        <Story />
      </div>
    ),
  ],
};

/** Texto largo y referencia larga: no deben desbordar en 320 px. */
export const TextoLargo: Story = {
  args: {
    title: "No pudimos mostrar el presupuesto de obra con todos sus capítulos y partidas",
    description:
      "Intenta de nuevo. Si el problema continúa, avísanos con la referencia que aparece abajo para que podamos revisarlo más rápido.",
    reference: "7f3c9a2e-5b1d-4c80-9e6a-1d2b3c4d5e6f-0123456789",
  },
};
