import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { ToastProvider, useToast } from "./toast";

function Triggers() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => toast({ title: "Pago registrado", description: "$ 142.800 · Nequi", variant: "success" })}>
        Éxito
      </Button>
      <Button variant="outline" onClick={() => toast("No se pudo guardar la partida", "error")}>
        Error
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          toast({ title: "Recordatorio enviado", description: "WhatsApp a Carlos Peña", undo: () => toast("Recordatorio cancelado") })
        }
      >
        Con deshacer
      </Button>
      <Button variant="secondary" onClick={() => toast({ title: "Sin conexión", description: "Mostramos los últimos datos guardados.", variant: "warning" })}>
        Aviso
      </Button>
    </div>
  );
}

const meta = {
  title: "Moléculas/Toast",
  component: ToastProvider,
  args: { children: null },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "`useToast().toast(...)` acepta texto y variante o un objeto con título, descripción y deshacer. Entran con resorte (arriba en móvil, abajo a la derecha en PC), la barra oro se pausa con el cursor, se descartan deslizándolas y nunca hay más de tres.",
      },
    },
  },
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <ToastProvider>
      <div className="h-[420px] p-6">
        <Triggers />
      </div>
    </ToastProvider>
  ),
};
