import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { ReceiptPrinter, type ReceiptData } from "./receipt-printer";

const data: ReceiptData = {
  business: "Barbería El Caballero",
  subtitle: "Cartagena",
  client: "Carlos Peña",
  concept: "Corte y barba",
  total: "$ 55.000",
  meta: [
    { label: "Recibo", value: "REC-1158" },
    { label: "Cliente", value: "Carlos Peña" },
    { label: "Medio", value: "Nequi" },
    { label: "Fecha", value: "16 oct 2026, 10:30 a. m." },
  ],
};

function Demo() {
  const [key, setKey] = useState(0);
  return (
    <div className="grid justify-items-center gap-4">
      <ReceiptPrinter data={data} printKey={key} />
      <Button variant="outline" size="sm" onClick={() => setKey((k) => k + 1)}>
        Imprimir de nuevo
      </Button>
    </div>
  );
}

const meta = {
  title: "Organismos/Finanzas/ReceiptPrinter",
  component: Demo,
  parameters: { docs: { description: { component: "FLU·01 — el papel sale en 10 tirones (1,6 s), la N se rellena y saltan cortes dorados." } } },
} satisfies Meta<typeof Demo>;
export default meta;

export const Imprimiendo: StoryObj<typeof meta> = {};
