import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { cn } from "@/lib/utils";
import { PrettyModal, PrettyModalClose, type PrettyModalOrigin } from "./pretty-modal";
import lab from "./pretty-modal.module.css";

function DemoFields() {
  return (
    <div className="grid gap-3">
      <div>
        <Label htmlFor="pm-desc" className="mb-1.5">
          Descripción
        </Label>
        <Input id="pm-desc" placeholder="Concreto 3000 psi para zapatas" />
      </div>
      <p className="text-sm text-muted-foreground">
        Este es el contenido real de un modal de la app: cabecera con título y X, cuerpo con
        formulario y pie con acciones. Lo único distinto es la animación.
      </p>
    </div>
  );
}

function DemoFooter() {
  return (
    <>
      <PrettyModalClose asChild>
        <Button variant="outline">Cancelar</Button>
      </PrettyModalClose>
      <PrettyModalClose asChild>
        <Button>Crear partida</Button>
      </PrettyModalClose>
    </>
  );
}

/**
 * Banco de pruebas aislado (rama `PrettyModal`). Copia del modal centrado de la
 * app (`ResponsiveSheet`) con la animación del ZIP aplicada tal cual: el modal
 * nace del control o del punto donde se pulsa, viaja al centro con un arco y
 * vuelve exactamente al origen al cerrar (botón, Escape o fondo).
 *
 * Nada de la app importa este laboratorio. En esta prueba el modal siempre es
 * centrado, también en móvil (como en el ZIP); la hoja inferior móvil de la app
 * queda fuera.
 */
const meta = {
  title: "Laboratorio/PrettyModal",
  component: PrettyModal,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Laboratorio aislado: la animación de `PrettyModal` (ZIP) aplicada a una copia del modal centrado de la app. No lo usa ninguna pantalla.",
      },
    },
  },
  args: {
    open: false,
    onOpenChange: () => {},
    title: "Nueva partida",
    description: "Se guardará en el proyecto activo.",
    size: "md",
    openDuration: 0.75,
    closeDuration: 0.55,
    openEase: "expo.out",
    closeEase: "expo.inOut",
    origin: null,
    children: <DemoFields />,
    footer: <DemoFooter />,
  },
  argTypes: {
    open: { table: { disable: true } },
    onOpenChange: { table: { disable: true } },
    origin: { table: { disable: true } },
    children: { table: { disable: true } },
    footer: { table: { disable: true } },
    title: { control: "text" },
    description: { control: "text" },
    size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
    openDuration: { control: { type: "range", min: 0.1, max: 2, step: 0.05 } },
    closeDuration: { control: { type: "range", min: 0.1, max: 2, step: 0.05 } },
    openEase: { control: "text" },
    closeEase: { control: "text" },
  },
} satisfies Meta<typeof PrettyModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Un botón, controles para jugar con duración y curvas. */
export const Playground: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <div className={lab.playground}>
        <p className={lab.hint}>
          Pulsa «Abrir»: el modal nace del botón y vuelve a él al cerrar con Escape, el fondo o la X.
        </p>
        <Button onClick={() => setOpen(true)}>Abrir modal</Button>
        <PrettyModal {...args} open={open} onOpenChange={setOpen}>
          <DemoFields />
        </PrettyModal>
      </div>
    );
  },
};

/** El escenario del ZIP: ocho botones en bordes y esquinas, o un clic en cualquier punto. */
export const Escenario: Story = {
  name: "Escenario (8 esquinas + clic libre)",
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    const [origin, setOrigin] = useState<PrettyModalOrigin>(null);
    const openFrom = (next: PrettyModalOrigin) => {
      setOrigin(next);
      setOpen(true);
    };

    return (
      <div
        className={lab.stage}
        onClick={(event) => {
          // Los clics dentro del portal también burbujean por el árbol de React:
          // sin esta guarda, cerrar desde el fondo reabriría el modal.
          if (!event.currentTarget.contains(event.target as Node)) return;
          if ((event.target as Element).closest("button")) return;
          openFrom({ x: event.clientX, y: event.clientY });
        }}
      >
        <p className={lab.hint}>
          Pulsa cualquier botón, o haz clic en cualquier punto vacío de la pantalla. El modal sale
          de ahí hacia el centro y vuelve al cerrarse.
        </p>
        <div className={cn(lab.row, lab.rowTop)}>
          <Button onClick={() => openFrom(null)}>Abrir</Button>
          <Button onClick={() => openFrom(null)}>Abrir</Button>
          <Button onClick={() => openFrom(null)}>Abrir</Button>
        </div>
        <div className={cn(lab.row, lab.rowMid)}>
          <Button onClick={() => openFrom(null)}>Abrir</Button>
          <Button onClick={() => openFrom(null)}>Abrir</Button>
        </div>
        <div className={cn(lab.row, lab.rowBottom)}>
          <Button onClick={() => openFrom(null)}>Abrir</Button>
          <Button onClick={() => openFrom(null)}>Abrir</Button>
          <Button onClick={() => openFrom(null)}>Abrir</Button>
        </div>
        <PrettyModal {...args} open={open} origin={origin} onOpenChange={setOpen}>
          <DemoFields />
        </PrettyModal>
      </div>
    );
  },
};
