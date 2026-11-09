import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { ToastProvider } from "@/components/molecules/toast";
import { PAYMENT_METHODS } from "@/lib/foundation/kernel/payment-vocabulary";
import { PaymentSheet } from "./payment-sheet";

function Demo({ fail = false }: { fail?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Registrar pago</Button>
      <PaymentSheet
        open={open}
        onOpenChange={setOpen}
        business={{ name: "Barbería El Caballero", subtitle: "Cartagena" }}
        methods={PAYMENT_METHODS}
        customers={[
          { id: "c1", name: "Carlos Peña", hint: "Plan Plata", phone: "3001234567" },
          { id: "c2", name: "Laura Gómez", hint: "Básico" },
          { id: "c3", name: "Distribuidora Internacional de Uniformes y Dotaciones del Caribe S.A.S.", hint: "compras@distribuidoracaribe.com.co", phone: "3009876543" },
        ]}
        onCharge={async () => {
          await new Promise((r) => setTimeout(r, 900));
          return fail
            ? { ok: false, message: "El valor supera el máximo permitido de $ 50.000.000 por operación. Revísalo o pide a Nexus ampliar el límite de tu negocio." }
            : { ok: true, reference: "REC-1158", createdAt: new Date().toISOString(), link: "https://nexus.example/r/demo" };
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
  parameters: { docs: { description: { component: "FLU·04 — teclado (también el del computador) → cliente → medio → Cobrar con la N → la hoja se cierra y el comprobante sale abajo a la derecha con «Compartir» y «Ver», y luego se oculta." } } },
} satisfies Meta<typeof Demo>;
export default meta;

export const Cobro: StoryObj<typeof meta> = {};
export const ConError: StoryObj<typeof meta> = { args: { fail: true } };
export const Movil: StoryObj<typeof meta> = { globals: { viewport: { value: "mobile1" } } };

