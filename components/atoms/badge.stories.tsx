import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, StatusDot } from "./badge";

const meta = {
  title: "Átomos/Presentación/Badge",
  id: "átomos-badge",
  component: Badge,
  args: { children: "Contratada" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "gold", "solid", "destructive"],
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

/** Los estados llevan un glifo de 10 px (`tone`: ✓ × ! ● –) junto al texto: la forma distingue el estado aunque no se vea el color. */
export const WithStatusDot: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge tone="success">Activo</Badge>
      <Badge tone="warning" pulse>Por vencer</Badge>
      <Badge tone="danger">Vencida</Badge>
      <Badge tone="neutral">Pendiente</Badge>
      <Badge variant="solid">Nuevo</Badge>
    </div>
  ),
};

/** `StatusDot` suelto, para tablas y listas. */
export const Dots: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <StatusDot tone="success" />
      <StatusDot tone="warning" pulse />
      <StatusDot tone="danger" />
      <StatusDot tone="muted" />
    </div>
  ),
};
