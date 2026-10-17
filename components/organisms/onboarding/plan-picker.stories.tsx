import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PlanPicker, type PlanSelection } from "./plan-picker";

function Demo({ vertical, initial }: { vertical: "construction" | "gym" | "beauty"; initial: PlanSelection }) {
  const [value, setValue] = useState(initial);
  return <PlanPicker vertical={vertical} value={value} onChange={setValue} />;
}

const meta = {
  title: "Organismos/Onboarding/PlanPicker",
  component: Demo,
  decorators: [(Story) => <div className="max-w-[680px] p-6"><Story /></div>],
  args: { vertical: "construction", initial: { plan: "ESSENTIAL", billing: "MONTHLY", selected: [] } },
} satisfies Meta<typeof Demo>;
export default meta;

export const Gratis: StoryObj<typeof meta> = {};
export const EliteConstruccion: StoryObj<typeof meta> = {
  args: { initial: { plan: "ELITE", billing: "MONTHLY", selected: ["quotes", "whatsapp"] } },
};
export const SignatureAnualGimnasio: StoryObj<typeof meta> = {
  args: { vertical: "gym", initial: { plan: "SIGNATURE", billing: "ANNUAL", selected: [] } },
};
