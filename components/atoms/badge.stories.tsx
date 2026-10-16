import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, StatusDot } from "./badge";

const meta = {
  title: "Átomos/Badge",
  component: Badge,
  args: { children: "Contratada" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "gold", "success", "destructive", "warning"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Por defecto</Badge>
      <Badge variant="outline">Contorno</Badge>
      <Badge variant="gold">Aviso</Badge>
      <Badge variant="destructive">Vencida</Badge>
    </div>
  ),
};

/** Los estados llevan un punto cuadrado de 6 px, no una píldora de color. */
export const WithStatusDot: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge><StatusDot tone="success" />Aprobada</Badge>
      <Badge><StatusDot tone="warning" />Enviada</Badge>
      <Badge><StatusDot tone="danger" />Rechazada</Badge>
      <Badge><StatusDot tone="muted" />Borrador</Badge>
    </div>
  ),
};
