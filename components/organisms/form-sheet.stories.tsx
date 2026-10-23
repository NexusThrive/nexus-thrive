import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { ContextHelp } from "@/components/molecules/context-help";
import { Field } from "@/components/molecules/field";
import { FormDialog, FormDrawer, type FormSheetResult } from "./form-sheet";

/**
 * Envío simulado: "error" en el nombre devuelve un error de campo; "caida"
 * simula que el servidor no responde. Cualquier otro nombre guarda.
 */
async function fakeSave(data: FormData): Promise<FormSheetResult> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const name = String(data.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { name: "Escribe el nombre del cliente." } };
  if (name.toLowerCase() === "error") return { ok: false, message: "Ya existe un cliente con ese nombre.", fieldErrors: { name: "Usa otro nombre." } };
  if (name.toLowerCase() === "caida") throw new Error("network");
  return { ok: true };
}

function Demo({ variant }: { variant: "dialog" | "drawer" }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const Sheet = variant === "dialog" ? FormDialog : FormDrawer;
  return (
    <div className="grid justify-items-start gap-3">
      <Button onClick={() => setOpen(true)}>{variant === "dialog" ? "Nuevo cliente" : "Editar cliente"}</Button>
      <p role="status" className="text-[13px] text-muted-foreground" data-testid="result">
        {saved}
      </p>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={variant === "dialog" ? "Nuevo cliente" : "Carlos Peña"}
        description={variant === "dialog" ? "Agrega un contacto a tu cartera." : "Plan Plata · cliente desde 2025"}
        submitLabel="Guardar cliente"
        onSubmit={fakeSave}
        onSuccess={() => setSaved("Cliente guardado")}
      >
        {({ fieldErrors }) => (
          <>
            <Field label="Nombre completo" required error={fieldErrors.name}>
              {(p) => <Input {...p} name="name" autoComplete="name" />}
            </Field>
            <Field
              label="Correo electrónico"
              optional
              hint="Le llegan los recibos."
              help={<ContextHelp topic="el correo electrónico">Solo para recibos y avisos del negocio.</ContextHelp>}
            >
              {(p) => <Input {...p} name="email" type="email" autoComplete="email" />}
            </Field>
            {variant === "drawer" ? (
              <Field label="Nota" optional>
                {(p) => <Textarea {...p} name="note" />}
              </Field>
            ) : null}
          </>
        )}
      </Sheet>
    </div>
  );
}

const meta = {
  title: "Organismos/FormSheet",
  component: FormDialog,
  parameters: {
    docs: {
      description: {
        component:
          "`FormDialog` (crear o editar pocos campos) y `FormDrawer` (registro con contexto). Pie fijo, bloqueo mientras guarda, error con `role=alert` y foco al primer campo inválido; lo escrito no se pierde. Escribe \"error\" o \"caida\" en el nombre para ver los fallos.",
      },
    },
  },
} satisfies Meta<typeof FormDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = { open: false, onOpenChange: () => {}, title: "", onSubmit: () => {}, children: null };

export const Dialog: Story = { args: noop, render: () => <Demo variant="dialog" /> };
export const Drawer: Story = { args: noop, render: () => <Demo variant="drawer" /> };
