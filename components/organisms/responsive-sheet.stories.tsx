import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { Input } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { ResponsiveSheet, SheetCloseButton } from "./responsive-sheet";

const form = (
  <form className="grid gap-3.5">
    <Field label="Nombre completo" required>{(p) => <Input {...p} placeholder="Ej. María Torres" />}</Field>
    <Field label="Celular" hint="10 dígitos">{(p) => <Input {...p} inputMode="tel" placeholder="300 123 4567" />}</Field>
    <div className="grid gap-1.5">
      <span className="text-[13px] font-medium">Plan</span>
      <ChipRow>
        <Chip selected>Gold</Chip>
        <Chip>Plata</Chip>
        <Chip>Básico</Chip>
      </ChipRow>
    </div>
  </form>
);

const footer = (
  <>
    <SheetCloseButton asChild>
      <Button variant="outline">Cancelar</Button>
    </SheetCloseButton>
    <Button>Guardar cliente</Button>
  </>
);

const meta = {
  title: "Organismos/ResponsiveSheet",
  component: ResponsiveSheet,
  args: {
    title: "Nuevo cliente",
    description: "Agrega un contacto a tu cartera.",
    trigger: <Button>Abrir</Button>,
    footer,
    children: form,
  },
  argTypes: { trigger: { control: false }, footer: { control: false }, children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          "En móvil es una hoja inferior que se cierra arrastrándola hacia abajo; en PC, un modal centrado (`wide`/`extraWide`) o un cajón lateral (`drawer`). Prueba la vista móvil en la barra de viewports.",
      },
    },
  },
} satisfies Meta<typeof ResponsiveSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Modal: Story = {};
export const Drawer: Story = { args: { drawer: true, title: "Carlos Peña", description: "Plan Plata · cliente desde 2025" } };
export const OpenOnMobile: Story = { args: { open: true }, globals: { viewport: { value: "mobile1" } } };

/** Pulsa los botones de las esquinas y el centro: el modal nace de cada uno y se cierra hacia él. */
export const MorphFromButtons: Story = {
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 520 } } },
  render: () => {
    const spots = [
      ["Arriba izquierda", "left-4 top-4"],
      ["Arriba derecha", "right-4 top-4"],
      ["Centro", "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"],
      ["Abajo izquierda", "bottom-4 left-4"],
      ["Abajo derecha", "bottom-4 right-4"],
    ] as const;
    return (
      <div className="relative h-[500px]">
        {spots.map(([name, position]) => (
          <div key={name} className={`absolute ${position}`}>
            <ResponsiveSheet open={undefined} title={name} description="Nació del botón que pulsaste." trigger={<Button variant="outline">{name}</Button>} footer={footer}>
              {form}
            </ResponsiveSheet>
          </div>
        ))}
      </div>
    );
  },
};

function MountedWhileOpen({ drawer }: { drawer: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{drawer ? "Abrir panel" : "Abrir modal"}</Button>
      {/* Patrón de la app: el panel solo existe mientras está abierto; al cerrar, el padre lo quita en el acto. */}
      {open ? (
        <ResponsiveSheet open onOpenChange={setOpen} drawer={drawer} title="Montado solo si está abierto" footer={footer}>
          {form}
        </ResponsiveSheet>
      ) : null}
    </>
  );
}

/** El modal solo existe mientras está abierto (como en la mayoría de pantallas): igual se anima al irse. */
export const MountedOnlyWhileOpenDialog: Story = { render: () => <MountedWhileOpen drawer={false} /> };
/** Lo mismo con el panel lateral: se desliza hacia la derecha al cerrar. */
export const MountedOnlyWhileOpenDrawer: Story = { render: () => <MountedWhileOpen drawer /> };

function NoFormSheet() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Carlos Peña");
  const [saved, setSaved] = useState("");
  return (
    <>
      <Button onClick={() => setOpen(true)}>Editar sin formulario</Button>
      <p role="status" className="mt-2 text-[13px] text-muted-foreground">{saved}</p>
      {open ? (
        <ResponsiveSheet
          open
          onOpenChange={setOpen}
          title="Editar (sin form)"
          footer={
            <>
              <SheetCloseButton asChild><Button variant="outline">Cancelar</Button></SheetCloseButton>
              <Button onClick={() => { setSaved(`Guardado: ${name}`); setOpen(false); }}>Guardar</Button>
            </>
          }
        >
          <Field label="Nombre">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        </ResponsiveSheet>
      ) : null}
    </>
  );
}

/** Edición con estado propio y sin `<form>`: igual pregunta antes de cerrar con cambios; «Guardar» pulsa el botón principal del pie. */
export const EditWithoutForm: Story = { render: () => <NoFormSheet /> };
