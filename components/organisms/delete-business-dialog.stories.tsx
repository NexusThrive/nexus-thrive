import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { DeleteBusinessDialog } from "./delete-business-dialog";

function Demo(args: React.ComponentProps<typeof DeleteBusinessDialog>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Eliminar negocio</Button>
      <DeleteBusinessDialog {...args} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const meta = {
  title: "Organismos/DeleteBusinessDialog",
  component: DeleteBusinessDialog,
  args: { open: false, onClose: () => {}, businessName: "Gimnasio Demo", onConfirm: async (): Promise<{ ok: boolean; message?: string }> => ({ ok: true }) },
  parameters: { docs: { description: { component: "Borrado de raíz: exige escribir el nombre del negocio. Si el servidor rechaza, el diálogo sigue abierto y muestra el motivo." } } },
} satisfies Meta<typeof DeleteBusinessDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: (args) => <Demo {...args} /> };
export const ServerError: Story = {
  args: { onConfirm: async () => ({ ok: false, message: "No se pudo eliminar: hay una suscripción activa." }) },
  render: (args) => <Demo {...args} />,
};
