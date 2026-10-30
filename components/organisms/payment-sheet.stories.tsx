import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { ToastProvider } from "@/components/molecules/toast";
import { PAYMENT_METHODS } from "@/lib/finance";
import { PaymentSheet } from "./payment-sheet";

function Demo({ fail = false, fullHref }: { fail?: boolean; fullHref?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Registrar pago</Button>
      <PaymentSheet
        open={open}
        onOpenChange={setOpen}
        fullHref={fullHref}
        business={{ name: "Barbería El Caballero", subtitle: "Cartagena" }}
        methods={PAYMENT_METHODS}
        customers={[
          { id: "c1", name: "Carlos Peña", hint: "Plan Plata", phone: "3001234567" },
          { id: "c2", name: "Laura Gómez", hint: "Básico" },
        ]}
        onCharge={async () => {
          await new Promise((r) => setTimeout(r, 900));
          return fail
            ? { ok: false, message: "Ya existe un pago con esa referencia." }
            : { ok: true, reference: "REC-1158", createdAt: new Date().toISOString() };
        }}
      />
    </>
  );
}

const meta = {
  title: "Organismos/Finanzas/PaymentSheet",
  component: Demo,
  // El cobro avisa con toasts: sin proveedor la historia fallaba al pintar.
  decorators: [(Story) => <ToastProvider><Story /></ToastProvider>],
  parameters: { docs: { description: { component: "FLU·04 — teclado (también el del computador) → cliente → medio → Cobrar con la N → recibo impreso → WhatsApp o Listo." } } },
} satisfies Meta<typeof Demo>;
export default meta;

export const Cobro: StoryObj<typeof meta> = {};
export const ConError: StoryObj<typeof meta> = { args: { fail: true } };
export const Movil: StoryObj<typeof meta> = { globals: { viewport: { value: "mobile1" } } };

/** Mini-modal de «Crear»: cobra sin salir de la pantalla y ofrece «Abrir en el panel completo». */
export const MiniModal: StoryObj<typeof meta> = { args: { fullHref: "/gym-norte/finance?nuevo=pago" } };
