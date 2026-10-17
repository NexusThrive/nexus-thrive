import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AmountDisplay } from "@/components/atoms/amount-display";
import { Keypad, applyKey } from "./keypad";

function Demo() {
  const [value, setValue] = useState(0);
  return (
    <div className="grid w-[260px] gap-3">
      <AmountDisplay value={value} />
      <Keypad onKey={(k) => setValue((v) => applyKey(v, k))} />
    </div>
  );
}

const meta = {
  title: "Moléculas/Keypad",
  component: Demo,
  parameters: { docs: { description: { component: "CTL·07 — cada tecla hace saltar la cifra (resorte 700 · 15). Para cobrar con una mano." } } },
} satisfies Meta<typeof Demo>;
export default meta;

export const Teclado: StoryObj<typeof meta> = {};
