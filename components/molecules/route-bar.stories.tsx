import Link from "next/link";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RouteBar } from "./route-bar";

const meta = {
  title: "Moléculas/RouteBar",
  component: RouteBar,
  parameters: {
    docs: {
      description: {
        component:
          "Barra de 2 px bajo la topbar que aparece al pulsar un enlace interno y se completa cuando cambia la ruta. Pulsa el enlace para verla.",
      },
    },
  },
} satisfies Meta<typeof RouteBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnNavigation: Story = {
  render: () => (
    <div className="relative">
      <RouteBar />
      <Link className="text-sm underline" href="/constructora/projects">
        Ir a Obras
      </Link>
    </div>
  ),
};
