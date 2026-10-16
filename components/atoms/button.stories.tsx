import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plus, Trash2 } from "lucide-react";
import { fn } from "storybook/test";
import { Button } from "./button";

const meta = {
  title: "Átomos/Button",
  component: Button,
  args: { children: "Guardar cambios", onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "accent", "outline", "secondary", "ghost", "danger", "link"],
    },
    size: { control: "inline-radio", options: ["default", "sm", "lg", "icon", "icon-sm"] },
    asChild: { control: false },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

/** Oro: un único CTA por pantalla. */
export const Accent: Story = { args: { variant: "accent", children: "Emitir cotización" } };

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="primary">Primario</Button>
      <Button {...args} variant="accent">Acento</Button>
      <Button {...args} variant="outline">Contorno</Button>
      <Button {...args} variant="secondary">Secundario</Button>
      <Button {...args} variant="ghost">Fantasma</Button>
      <Button {...args} variant="danger">Eliminar</Button>
      <Button {...args} variant="link">Enlace</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">Pequeño</Button>
      <Button {...args} size="default">Normal</Button>
      <Button {...args} size="lg">Grande</Button>
      <Button {...args} size="icon" aria-label="Agregar"><Plus /></Button>
      <Button {...args} size="icon-sm" variant="outline" aria-label="Eliminar"><Trash2 /></Button>
    </div>
  ),
};

export const WithIcon: Story = {
  args: { children: (<><Plus aria-hidden="true" /> Nueva obra</>) },
};

/** Mientras corre la mutación: N de marca en bucle y texto con enfoque. */
export const Loading: Story = { args: { loading: true } };

/** Al terminar (se muestra ~1.3 s y vuelve a reposo). */
export const Done: Story = { args: { done: true } };

export const Disabled: Story = { args: { disabled: true } };
