import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Field } from "./field";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "./popover";

const meta = {
  title: "Moléculas/Popover",
  component: Popover,
  parameters: {
    docs: {
      description: {
        component:
          "Ventana flotante compacta: acciones rápidas o un formulario de uno o dos campos junto al control que lo abre. Para más, un diálogo o un panel lateral.",
      },
    },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const QuickEdit: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Renombrar etiqueta</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <form className="grid gap-3" onSubmit={(event) => event.preventDefault()}>
          <Field label="Nombre de la etiqueta">{(p) => <Input {...p} defaultValue="VIP" />}</Field>
          <div className="flex justify-end gap-2">
            <PopoverClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancelar
              </Button>
            </PopoverClose>
            <Button type="submit" size="sm">
              Guardar
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  ),
};
