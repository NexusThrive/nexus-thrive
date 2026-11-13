"use client";

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Banknote, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { ProductTour, type TourStep } from "./product-tour";

const meta = {
  title: "Organismos/ProductTour",
  component: ProductTour,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Recorrido guiado por la interfaz real: resalta una pieza a la vez y la explica en un `Popover` anclado a ella. El resaltado viaja de una pieza a la siguiente. Escape o un clic fuera lo cierran y el foco vuelve a la página. Los pasos sin pieza visible (por ejemplo la barra lateral en móvil) se saltan; con movimiento reducido el resaltado cambia sin desplazarse. Cada paso recibe una lista de selectores y usa el primero visible." } },
  },
} satisfies Meta<typeof ProductTour>;

export default meta;
type Story = StoryObj<typeof meta>;

const STEPS: TourStep[] = [
  { target: ["[data-tour='buscar']"], title: "Busca lo que sea", body: "Clientes, cobros, productos y páginas desde un solo lugar. Atajo: Ctrl K.", side: "bottom" },
  { target: ["[data-tour='cliente']"], title: "Agrega tu primer cliente", body: "Con nombre y teléfono basta. Después puedes completar el resto.", side: "bottom" },
  { target: ["[data-tour='no-existe']", "[data-tour='cobro']"], title: "Registra un cobro", body: "Si el primer selector no está visible, se usa el siguiente.", side: "top" },
];

const args = { steps: STEPS, open: false, onClose: () => undefined };

function Escenario({ iniciaAbierto }: { iniciaAbierto: boolean }) {
  const [open, setOpen] = useState(iniciaAbierto);
  const [fin, setFin] = useState<string | null>(null);
  return (
    <div style={{ minHeight: 420, padding: 32, display: "grid", gap: 24, alignContent: "start" }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Button variant="outline" data-tour="buscar">
          <Search aria-hidden="true" className="size-4" /> Buscar
        </Button>
        <Button variant="outline" data-tour="cliente">
          <UserPlus aria-hidden="true" className="size-4" /> Cliente
        </Button>
        <Button variant="outline" data-tour="cobro" style={{ marginInlineStart: "auto" }}>
          <Banknote aria-hidden="true" className="size-4" /> Cobro
        </Button>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Button variant="accent" onClick={() => { setFin(null); setOpen(true); }}>
          Ver recorrido
        </Button>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {fin ?? "Pulsa para empezar."}
        </p>
      </div>
      <ProductTour
        steps={STEPS}
        open={open}
        onClose={(completed) => {
          setOpen(false);
          setFin(completed ? "Recorrido terminado." : "Recorrido cerrado antes de terminar.");
        }}
      />
    </div>
  );
}

/** Empieza cerrado: la persona lo abre cuando quiere. */
export const Default: Story = { args, render: () => <Escenario iniciaAbierto={false} /> };

/** Abierto desde el primer paso, como la primera vez que entra al negocio. */
export const PrimeraVez: Story = { args, render: () => <Escenario iniciaAbierto /> };
