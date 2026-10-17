import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Building2, Dumbbell, Plane } from "lucide-react";
import { Button } from "@/components/atoms/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

const meta = {
  title: "Organismos/Command",
  component: Command,
  parameters: {
    docs: { description: { component: "Paleta de comandos (cmdk): búsqueda con teclado entre grupos de opciones. `CommandDialog` la abre como modal." } },
  },
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

function Items() {
  return (
    <>
      <CommandInput placeholder="Buscar negocio…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Negocios">
          <CommandItem><Building2 /> Constructora Andina <CommandShortcut>⌘1</CommandShortcut></CommandItem>
          <CommandItem><Dumbbell /> Gym Norte</CommandItem>
          <CommandItem><Plane /> Viajes del Café</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Acciones">
          <CommandItem>Crear negocio</CommandItem>
        </CommandGroup>
      </CommandList>
    </>
  );
}

export const Inline: Story = {
  render: () => (
    <Command className="max-w-md rounded-lg border border-border">
      <Items />
    </Command>
  ),
};

export const AsDialog: Story = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>Abrir paleta</Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <Items />
        </CommandDialog>
      </>
    );
  },
};
