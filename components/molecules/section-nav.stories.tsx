import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CreditCard, Palette, Store, UserRound, Users } from "lucide-react";
import { SectionNav } from "./section-nav";

const ITEMS = [
  { id: "profile", label: "Perfil del negocio", icon: Store, hint: "Nombre, contacto y datos fiscales", group: "Organización" },
  { id: "plan", label: "Plan y consumo", icon: CreditCard, hint: "Tu plan y lo que has usado", group: "Organización" },
  { id: "team", label: "Equipo y permisos", icon: Users, hint: "Quién entra y con qué rol", group: "Personas" },
  { id: "account", label: "Mi cuenta", icon: UserRound, hint: "Tus datos en este negocio", group: "Preferencias personales" },
  { id: "appearance", label: "Apariencia", icon: Palette, hint: "Tema y movimiento", group: "Preferencias personales" },
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
