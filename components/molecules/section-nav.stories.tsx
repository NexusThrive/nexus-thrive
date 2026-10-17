import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Blocks, CreditCard, Palette, Store } from "lucide-react";
import { SectionNav } from "./section-nav";

const ITEMS = [
  { id: "profile", label: "Perfil del negocio", icon: Store, hint: "Nombre, enlace y contacto" },
  { id: "plan", label: "Plan", icon: CreditCard, hint: "Thrive y lo que incluye" },
  { id: "modules", label: "Módulos", icon: Blocks, hint: "Activa lo que usas" },
  { id: "appearance", label: "Apariencia", icon: Palette, hint: "Tema y movimiento" },
] as const;

function Demo() {
  const [value, setValue] = useState<(typeof ITEMS)[number]["id"]>("profile");
  return (
    <div className="grid gap-6 lg:grid-cols-[248px_1fr]">
      <SectionNav ariaLabel="Secciones" items={ITEMS} value={value} onChange={setValue} />
      <div className="h-64 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{value}</div>
    </div>
  );
}

const meta = { title: "Moléculas/SectionNav", component: Demo } satisfies Meta<typeof Demo>;
export default meta;

export const Ajustes: StoryObj<typeof meta> = {};
