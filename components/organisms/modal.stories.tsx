import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import Modal from "./modal";

const meta = {
  title: "Organismos/Modal",
  component: Modal,
  args: {
    open: true,
    onClose: fn(),
    title: "Nueva partida",
    children: (
      <div className="grid gap-2">
        <Label htmlFor="desc">Descripción</Label>
        <Input id="desc" placeholder="Concreto 3000 psi para zapatas" />
      </div>
    ),
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Modal sin dependencias de los formularios de construcción: cierra con Escape o al pulsar el fondo. `wide` pasa de 576 a 768 px.",
      },
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
export const Wide: Story = { args: { wide: true, title: "Editar APU" } };

export const Interactive: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-6">
        <Button onClick={() => setOpen(true)}>Abrir</Button>
        <Modal {...args} open={open} onClose={() => setOpen(false)} />
      </div>
    );
  },
};
