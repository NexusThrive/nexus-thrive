import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QuickActionLink } from "./quick-action-link";
import { QuickCreateContext } from "./quick-create-host";
import { quickSheetFor } from "@/lib/navigation/quick-create";

function Demo() {
  const [opened, setOpened] = useState<string[]>([]);
  return (
    <QuickCreateContext.Provider
      value={{
        open: (key) => {
          const sheet = quickSheetFor(key);
          if (sheet) setOpened((o) => [...o, sheet]);
          return Boolean(sheet);
        },
      }}
    >
      <div className="grid gap-3">
        <QuickActionLink actionKey="payment" href="#panel-completo-pago" className="underline">Registrar pago</QuickActionLink>
        <QuickActionLink actionKey="booking" href="#panel-completo-reserva" className="underline">Nueva reserva</QuickActionLink>
        <p data-testid="opened">Mini-modales abiertos: {opened.join(", ") || "ninguno"}</p>
      </div>
    </QuickCreateContext.Provider>
  );
}

const meta = {
  title: "Organismos/QuickActionLink",
  component: Demo,
  parameters: { docs: { description: { component: "Enlace de una acción de «Crear»: con mini-modal, el clic normal lo abre sin navegar; sin él, o con Ctrl/⌘/Mayús, es un enlace de siempre a su sección." } } },
} satisfies Meta<typeof Demo>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
