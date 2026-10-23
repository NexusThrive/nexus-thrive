import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { ConfirmDialog, useConfirm } from "./confirm-dialog";
import { ResponsiveSheet } from "./responsive-sheet";

function Controlled({ fail = false, confirmText }: { fail?: boolean; confirmText?: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Anular venta
      </Button>
      <p role="status" data-testid="result" className="text-[13px] text-muted-foreground">
        {done}
      </p>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Anular la venta?"
        description="El cupo queda libre y el cobro se anula. Queda en la bitácora."
        confirmLabel="Anular venta"
        pendingLabel="Anulando…"
        confirmText={confirmText}
        onConfirm={async () => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (fail) return { ok: false, message: "La venta ya estaba anulada." };
          setDone("Venta anulada");
        }}
      >
        Venta #1042 · 2 entradas · $36.000
      </ConfirmDialog>
    </div>
  );
}

function HookDemo() {
  const [confirm, confirmDialog] = useConfirm();
  const [result, setResult] = useState<string | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <Button
        variant="outline"
        onClick={async () => {
          const ok = await confirm({ title: "¿Eliminar esta partida?", confirmLabel: "Eliminar partida" });
          setResult(ok ? "Confirmado" : "Cancelado");
        }}
      >
        Eliminar partida
      </Button>
      <p role="status" data-testid="result" className="text-[13px] text-muted-foreground">
        {result}
      </p>
      {confirmDialog}
    </div>
  );
}

/** Confirmar una acción destructiva desde un panel abierto (anular una venta). */
function InsideSheetDemo() {
  const [open, setOpen] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const [result, setResult] = useState<string | null>(null);
  return (
    <div className="grid justify-items-start gap-3">
      <Button onClick={() => setOpen(true)}>Ver venta</Button>
      <p role="status" data-testid="result" className="text-[13px] text-muted-foreground">
        {result}
      </p>
      <ResponsiveSheet open={open} onOpenChange={setOpen} drawer title="Venta #1042" description="2 entradas · $36.000">
        <Button
          variant="danger"
          onClick={async () => {
            const ok = await confirm({ title: "¿Anular la venta?", confirmLabel: "Anular venta" });
            setResult(ok ? "Anulada" : "Sin cambios");
          }}
        >
          Anular
        </Button>
        {confirmDialog}
      </ResponsiveSheet>
    </div>
  );
}

const meta = {
  title: "Organismos/ConfirmDialog",
  component: ConfirmDialog,
  parameters: {
    docs: {
      description: {
        component:
          "Reemplaza a `window.confirm`. Foco inicial en \"Cancelar\", no se cierra mientras procesa y muestra el error si falla. `useConfirm()` lo convierte en una promesa.",
      },
    },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = { open: false, onOpenChange: () => {}, title: "", confirmLabel: "", onConfirm: () => {} };

export const Default: Story = { args: noop, render: () => <Controlled /> };
export const Failing: Story = { args: noop, render: () => <Controlled fail /> };
/** Borrado de raíz: hay que escribir la palabra. */
export const TypeToConfirm: Story = { args: noop, render: () => <Controlled confirmText="anular" /> };
export const WithHook: Story = { args: noop, render: () => <HookDemo /> };

export const InsideSheet: Story = { args: noop, render: () => <InsideSheetDemo /> };
