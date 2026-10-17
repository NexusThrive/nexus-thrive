import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/atoms/button";
import { NfcCard, type NfcFinish } from "./nfc-card";

function Demo({ finish = "negro" }: { finish?: NfcFinish }) {
  const [readKey, setReadKey] = useState(0);
  return (
    <div className="grid max-w-[760px] gap-3">
      <NfcCard name="Juan Pérez" role="Propietario · Juan" finish={finish} readKey={readKey} />
      <Button size="sm" className="justify-self-start" onClick={() => setReadKey((k) => k + 1)}>
        Acercar teléfono
      </Button>
    </div>
  );
}

const meta = {
  title: "Organismos/NfcCard",
  component: Demo,
  parameters: { docs: { description: { component: "MAR·01 — inclinación hasta 14° y 18° siguiendo al puntero, giro al tocar, flotación sola y lectura con ondas aceleradas y borde oro." } } },
} satisfies Meta<typeof Demo>;
export default meta;

export const Negro: StoryObj<typeof meta> = {};
export const Blanco: StoryObj<typeof meta> = { args: { finish: "blanco" } };
