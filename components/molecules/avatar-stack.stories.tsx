import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AvatarStack } from "./avatar-stack";

const people = ["María Pérez", "Colegio San José", "Carlos Ramírez", "Hotel Marbella", "Laura Gómez"].map((name, i) => ({ key: `p${i}`, name, href: "#", identity: { name } }));

const meta = {
  title: "Moléculas/AvatarStack",
  component: AvatarStack,
  parameters: { docs: { description: { component: "Personas en círculos superpuestos (foto o blobatar). Al pasar el cursor o al enfocar, el círculo se alza. Círculo final opcional de resumen («+3»). Usos: clientes nuevos y equipo en Inicio." } } },
  args: { label: "Últimos clientes creados", people, extra: { text: "+3", href: "#", label: "3 clientes nuevos hoy" } },
} satisfies Meta<typeof AvatarStack>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConResumen: Story = {};
export const SinResumen: Story = { args: { extra: null } };
export const Pequeno: Story = { args: { size: "sm" } };
