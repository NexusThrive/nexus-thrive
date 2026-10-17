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
