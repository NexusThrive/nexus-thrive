import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MonthCalendar } from "./month-calendar";
import { WeekStrip } from "./week-strip";

const TODAY = "2026-10-16";
const counts = { "2026-10-13": 2, "2026-10-15": 4, "2026-10-16": 3, "2026-10-19": 1, "2026-10-22": 5 };

function Demo() {
  const [day, setDay] = useState(TODAY);
  return (
    <div className="grid max-w-[340px] gap-3.5">
      <WeekStrip value={day} today={TODAY} counts={counts} onChange={setDay} />
      <MonthCalendar value={day} today={TODAY} marked={new Set(Object.keys(counts))} onChange={setDay} />
    </div>
  );
}

const meta = {
  title: "Moléculas/WeekStrip",
  component: Demo,
  parameters: { docs: { description: { component: "NAV·04 — el bloque tinta viaja al día elegido (440 ms con rebote); en el celular se cambia de semana deslizando 50 px. Con el mes debajo en escritorio." } } },
} satisfies Meta<typeof Demo>;
export default meta;

export const SemanaYMes: StoryObj<typeof meta> = {};
