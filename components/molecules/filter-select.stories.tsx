import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import FilterSelect from "./filter-select";

const meta = {
  title: "Moléculas/FilterSelect",
  component: FilterSelect,
  args: {
    paramKey: "status",
    pageParam: "page",
    allLabel: "Todos los estados",
    value: "",
    options: [
      { value: "DRAFT", label: "Borrador" },
      { value: "QUOTING", label: "En cotización" },
      { value: "CONTRACTED", label: "Contratada" },
      { value: "IN_PROGRESS", label: "En ejecución" },
    ],
  },
  parameters: {
    nextjs: { navigation: { pathname: "/constructora/projects" } },
    docs: { description: { component: "Select nativo cuyo valor vive en la URL; al cambiarlo vuelve a la primera página de su sección." } },
  },
} satisfies Meta<typeof FilterSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {};
export const Selected: Story = { args: { value: "CONTRACTED" } };
