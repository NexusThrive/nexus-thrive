import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgendaTimeline, type AgendaItem } from "./agenda-timeline";

const ITEMS: AgendaItem[] = [
  { id: "1", time: "09:00", title: "Corte clásico", subtitle: "María Torres · 9:00 – 9:30 a. m. · $ 35.000", initials: "MT", done: true },
  { id: "2", time: "10:30", title: "Corte y barba", subtitle: "Laura Gómez · 10:30 – 11:15 a. m. · $ 55.000", initials: "LG", done: false },
  { id: "3", time: "15:00", title: "Color", subtitle: "Sofía Díaz · 3:00 – 4:30 p. m. · $ 80.000", initials: "SD", done: false },
];

function Demo({ empty = false }: { empty?: boolean }) {
  const [items, setItems] = useState(empty ? [] : ITEMS);
  return (
    <div className="max-w-[560px]">
      <AgendaTimeline items={items} now="12:40" onToggle={(it) => setItems((all) => all.map((x) => (x.id === it.id ? { ...x, done: true } : x)))} />
    </div>
  );
}

const meta = {
  title: "Organismos/Agenda/AgendaTimeline",
  component: Demo,
  parameters: { docs: { description: { component: "FLU·05 — marcar atendida: el botón rebota, la tarjeta se atenúa, el borde pasa de oro a verde y saltan 12 cortes." } } },
} satisfies Meta<typeof Demo>;
export default meta;

export const Dia: StoryObj<typeof meta> = {};
export const DiaLibre: StoryObj<typeof meta> = { args: { empty: true } };
