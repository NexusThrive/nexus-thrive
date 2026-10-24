import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Field } from "@/components/molecules/field";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { Select } from "./select";

const methods = ["Nequi", "Efectivo", "Tarjeta", "Transferencia"];

const meta = {
  title: "Átomos/Select",
  component: Select,
  args: {
    "aria-label": "Medio de pago",
    defaultValue: "Nequi",
    children: methods.map((m) => <option key={m}>{m}</option>),
  },
  argTypes: { children: { control: false } },
  decorators: [(Story) => <div className="min-h-64 max-w-xs"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component:
          "Select propio de NEXUS: botón con forma de campo y lista flotante dibujada con divs, no el menú nativo del sistema. Misma API que `<select>` (hijos `<option>`/`<optgroup>`, `value`/`defaultValue`, `onChange(e)` con `e.target.value`, `name`, `required`, `disabled`) y participa en formularios y Server Actions porque debajo vive un `<select>` real oculto. Teclado: ↑ ↓ abren y mueven, Inicio/Fin, escribir salta a una opción, Enter/Espacio eligen, Esc cierra. Opciones de 44 px en táctil. Prohibido el `<select>` nativo (lo vigila `lib/design/ui-rules.test.ts`).",
      },
    },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithPlaceholder: Story = {
  args: { defaultValue: "", children: [<option key="" value="" disabled>Elige un medio…</option>, ...methods.map((m) => <option key={m}>{m}</option>)] },
};
export const Groups: Story = {
  args: {
    defaultValue: "Nequi",
    children: [
      <optgroup key="d" label="Digital">{["Nequi", "Daviplata"].map((m) => <option key={m}>{m}</option>)}</optgroup>,
      <optgroup key="f" label="Físico">{["Efectivo", "Tarjeta"].map((m) => <option key={m}>{m}</option>)}</optgroup>,
    ],
  },
};
export const DisabledOption: Story = {
  args: { children: [<option key="a">Nequi</option>, <option key="b" disabled>Tarjeta (no disponible)</option>, <option key="c">Efectivo</option>] },
};
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { "aria-invalid": true } };

function InField() {
  const [value, setValue] = useState("");
  return (
    <Field label="Medio de pago" required error={value ? undefined : "Elige un medio de pago."}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="" disabled>Elige…</option>
          {methods.map((m) => <option key={m}>{m}</option>)}
        </Select>
      )}
    </Field>
  );
}
/** Dentro de `Field`: etiqueta, error y `aria-*` llegan al botón. */
export const InsideField: Story = { render: () => <InField /> };

function LongList() {
  return (
    <Select aria-label="Ciudad" defaultValue="">
      <option value="">Todas las ciudades</option>
      {Array.from({ length: 40 }, (_, i) => <option key={i}>{`Ciudad ${i + 1}`}</option>)}
    </Select>
  );
}
/** Lista larga: se desplaza con rueda y teclado; la opción activa siempre queda a la vista. */
export const LongListStory: Story = { name: "Lista larga", render: () => <LongList /> };

/** Dentro de un diálogo: la lista flota por encima y elegir no cierra el diálogo. */
export const InsideDialog: Story = {
  render: () => (
    <ResponsiveSheet open onOpenChange={() => {}} title="Nuevo cobro" description="El Select vive dentro del diálogo.">
      <Select aria-label="Medio de pago" defaultValue="Nequi">
        {methods.map((m) => <option key={m}>{m}</option>)}
      </Select>
    </ResponsiveSheet>
  ),
};
