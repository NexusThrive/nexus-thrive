import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Banknote, MinusCircle, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/atoms/avatar";
import { Badge } from "@/components/atoms/badge";
import { IconTile } from "@/components/atoms/icon-tile";
import { Amount, ListItem } from "./list-item";

const meta = {
  title: "Moléculas/ListItem",
  component: ListItem,
  args: { title: "María Torres", subtitle: "Corte y barba · Nequi" },
  decorators: [(Story) => <div className="max-w-md overflow-hidden rounded-lg border border-border"><Story /></div>],
} satisfies Meta<typeof ListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Movimientos: ingreso en tinta, gasto en rojo con su hora. */
export const Movements: Story = {
  render: () => (
    <>
      <ListItem
        leading={<IconTile size="sm"><Banknote /></IconTile>}
        title="María Torres"
        subtitle="Corte y barba · Nequi"
        trailing={<div className="text-right"><Amount value="+$ 55.000" /><p className="text-[11.5px] text-muted-foreground">Hace 5 min</p></div>}
      />
      <ListItem
        leading={<IconTile size="sm" tone="gold"><MinusCircle /></IconTile>}
        title="Insumos"
        subtitle="Caja menor"
        trailing={<div className="text-right"><Amount value="−$ 84.000" negative /><p className="text-[11.5px] text-muted-foreground">Hace 1 h</p></div>}
      />
    </>
  ),
};

export const Person: Story = {
  args: {
    leading: <Avatar><AvatarFallback tone="gold">CP</AvatarFallback></Avatar>,
    title: "Carlos Peña",
    subtitle: "Plan Plata · vence el viernes",
    trailing: <Badge tone="warning" pulse>Por vencer</Badge>,
  },
};

/** Acción rápida: fila interactiva con flecha. */
export const Action: Story = {
  args: {
    leading: <IconTile><UserPlus /></IconTile>,
    title: "Nuevo cliente",
    subtitle: "Agregar un contacto",
    chevron: true,
    interactive: true,
  },
};
