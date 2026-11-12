import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Field } from "./field";
import { DateInput } from "./date-input";

const meta = {
  title: "Moléculas/Formularios/DateInput",
  id: "moléculas-dateinput",
  component: DateInput,
  parameters: {
    docs: {
      description: {
        component:
          "Selector de fecha de NEXUS en lugar del campo de fecha del navegador: botón con el aspecto del campo que abre un calendario del mes (español, lunes primero, hoy con borde oro). Manda `AAAA-MM-DD` en el formulario y en `onChange`. `min`/`max` desactivan días; sin `required` se puede borrar.",
      },
    },
  },
  decorators: [(Story) => <div className="w-80 p-6"><Story /></div>],
} satisfies Meta<typeof DateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Field label="Fecha de vencimiento">{(c) => <DateInput {...c} name="due" />}</Field>,
};

export const WithValue: Story = {
  render: () => <Field label="Inicio">{(c) => <DateInput {...c} name="start" defaultValue="2026-11-10" />}</Field>,
};

export const WithRange: Story = {
  render: () => <Field label="Entrega" hint="Entre el 10 y el 20 de noviembre">{(c) => <DateInput {...c} name="due" defaultValue="2026-11-12" min="2026-11-10" max="2026-11-20" required />}</Field>,
};

export const Controlled: Story = {
  render: function Render() {
    const [value, setValue] = useState("2026-11-02");
    return <Field label="Fecha" hint={`Valor: ${value || "vacío"}`}>{(c) => <DateInput {...c} value={value} onChange={(e) => setValue(e.target.value)} />}</Field>;
  },
};
