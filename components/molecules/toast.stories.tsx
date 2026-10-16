import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { ToastProvider, useToast } from "./toast";

function Triggers() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => toast("Cotización emitida", "success")}>Éxito</Button>
      <Button variant="outline" onClick={() => toast("No se pudo guardar la partida", "error")}>Error</Button>
      <Button variant="ghost" onClick={() => toast("El presupuesto está bloqueado")}>Información</Button>
    </div>
  );
}

const meta = {
  title: "Moléculas/Toast",
  component: ToastProvider,
  args: { children: null },
  parameters: {
    docs: {
      description: {
        component:
          "`<ToastProvider>` envuelve el árbol cliente y cualquier hijo llama `useToast().toast(mensaje, variante)`. Máximo 4 visibles, se cierran solos a los 4,5 s.",
      },
    },
  },
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <ToastProvider>
      <Triggers />
    </ToastProvider>
  ),
};
