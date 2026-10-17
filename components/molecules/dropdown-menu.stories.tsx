import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/atoms/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = {
  title: "Moléculas/DropdownMenu",
  component: DropdownMenu,
  parameters: { layout: "centered" },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RowActions: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Acciones de la partida">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Partida 2.04</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem><Pencil /> Editar APU <DropdownMenuShortcut>E</DropdownMenuShortcut></DropdownMenuItem>
        <DropdownMenuItem><Copy /> Duplicar</DropdownMenuItem>
        <DropdownMenuCheckboxItem checked>Incluir en la cotización</DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive"><Trash2 /> Eliminar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const Open: Story = { ...RowActions, args: { defaultOpen: true } };
