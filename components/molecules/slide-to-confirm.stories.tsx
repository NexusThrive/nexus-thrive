import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { SlideToConfirm } from "./slide-to-confirm";

/** Demo: confirma tras un momento (o falla y vuelve al inicio) y muestra cuántas veces se confirmó. */
function Demo({ fail = false, disabled = false }: { fail?: boolean; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <div className="grid max-w-md gap-3 p-6">
      <SlideToConfirm
        label="Cobrar $ 45.000"
        doneLabel="Cobrado"
        busy={busy}
        disabled={disabled}
        onConfirm={async () => {
          setBusy(true);
          await new Promise((r) => setTimeout(r, 700));
          setBusy(false);
          if (fail) return false;
          setCount((n) => n + 1);
        }}
      />
      <p data-testid="confirmados" className="text-xs text-muted-foreground">
        Confirmados: {count}
      </p>
    </div>
  );
}

const meta = {
  title: "Moléculas/Formularios/SlideToConfirm",
  id: "moléculas-slidetoconfirm",
  component: Demo,
  parameters: {
    docs: {
      description: {
        component:
          "Deslizar para confirmar (idea del «Slide to confirm» de Bencho, MIT, sin librerías). Confirma solo al llegar al final; con teclado, Enter o Espacio en el asa. Al confirmar, el asa se despliega y llena la pista. Uso: cobrar en «Registrar pago».",
      },
    },
  },
} satisfies Meta<typeof Demo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Falla: Story = { args: { fail: true } };
export const Deshabilitado: Story = { args: { disabled: true } };
