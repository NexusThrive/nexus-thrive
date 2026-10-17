import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Archive, Banknote, MessageCircle, Pencil } from "lucide-react";
import { SwipeCard } from "./swipe-card";

const meta = {
  title: "Moléculas/SwipeCard",
  component: SwipeCard,
  globals: { viewport: { value: "mobile1" } },
  args: {
    actions: [
      { label: "Cobrar", icon: Banknote, tone: "gold", onClick: () => {} },
      { label: "Recordar", icon: MessageCircle, tone: "ink", onClick: () => {} },
      { label: "Editar", icon: Pencil, tone: "muted", onClick: () => {} },
      { label: "Archivar", icon: Archive, tone: "danger", onClick: () => {} },
    ],
    children: (
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="grid size-[34px] place-items-center rounded-md bg-primary font-display text-xs font-bold text-primary-foreground">LG</span>
        <span className="min-w-0 flex-1">
          <b className="block font-medium">Laura Gómez</b>
          <small className="text-xs text-muted-foreground">300 123 4567</small>
        </span>
      </div>
    ),
  },
  parameters: { docs: { description: { component: "DAT·06 — arrastra a la izquierda para ver las acciones; resorte al soltar y 25 % de resistencia al pasar del tope." } } },
} satisfies Meta<typeof SwipeCard>;
export default meta;

export const Cliente: StoryObj<typeof meta> = {};
