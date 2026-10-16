import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { Download, UserPlus } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { RevealText } from "@/components/atoms/reveal-text";
import { PageHeader, SectionTitle } from "./page-header";

const meta = {
  title: "Moléculas/PageHeader",
  component: PageHeader,
  args: {
    eyebrow: "Gestión",
    title: "Clientes",
    description: "14 clientes · 8 con membresía activa",
    actions: (
      <>
        <Button variant="outline"><Download aria-hidden="true" /> Exportar</Button>
        <Button variant="accent" magnetic><UserPlus aria-hidden="true" /> Nuevo cliente</Button>
      </>
    ),
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** El CTA oro (`magnetic`) se deja atraer por el cursor. */
export const Default: Story = {};

export const Greeting: Story = {
  args: {
    eyebrow: "Jueves 16 de octubre",
    title: <RevealText parts={["Buenas tardes, ", { text: "Juan", gold: true }]} />,
    description: "Así va tu negocio esta semana. 38 cobros registrados.",
    actions: undefined,
  },
};

export const Section: Story = {
  render: () => (
    <SectionTitle
      title="Membresías"
      action={<Link href="#" className="text-[13px] font-semibold text-accent-text">Ver clientes →</Link>}
    />
  ),
};
