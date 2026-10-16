import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SearchInput from "./search-input";

const meta = {
  title: "Moléculas/SearchInput",
  component: SearchInput,
  args: {
    paramKey: "q",
    pageParam: "page",
    ariaLabel: "Buscar obras",
    placeholder: "Buscar por nombre o código…",
    defaultValue: "",
  },
  parameters: {
    nextjs: { navigation: { pathname: "/constructora/projects" } },
    docs: {
      description: {
        component:
          "Busca mientras se escribe (debounce de 250 ms) y escribe el texto en la URL (`paramKey`), volviendo a la primera página (`pageParam`). Muestra la N mientras navega y un botón para limpiar.",
      },
    },
  },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithValue: Story = { args: { defaultValue: "Torre" } };
