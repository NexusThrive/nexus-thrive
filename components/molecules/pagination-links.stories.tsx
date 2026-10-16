import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PaginationLinks from "./pagination-links";

const meta = {
  title: "Moléculas/PaginationLinks",
  component: PaginationLinks,
  args: { paramKey: "page", page: 2, totalPages: 7, totalLabel: "164 actividades" },
  parameters: {
    nextjs: { navigation: { pathname: "/constructora/catalog" } },
    docs: { description: { component: "Anterior / Siguiente sobre el parámetro de página de la sección, conservando los demás filtros. No se muestra con una sola página." } },
  },
} satisfies Meta<typeof PaginationLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Middle: Story = {};
export const FirstPage: Story = { args: { page: 1 } };
export const LastPage: Story = { args: { page: 7 } };
