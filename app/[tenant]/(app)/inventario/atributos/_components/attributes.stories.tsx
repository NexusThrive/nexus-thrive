import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToastProvider } from "@/components/molecules/toast";
import AttributesView from "./attributes-view";

const meta = {
  title: "Páginas/Inventario/Atributos",
  component: AttributesView,
  decorators: [(Story) => <ToastProvider><div className="p-5"><Story /></div></ToastProvider>],
  parameters: { layout: "fullscreen", docs: { description: { component: "Atributos de producto: talla, color, material… Crean una variante por valor, son informativos o se escriben al vender (productos a medida)." } } },
  args: {
    slug: "demo",
    attributes: [
      { id: "talla", name: "Talla", display: "BUTTONS", variantMode: "ALWAYS", values: [{ id: "s", name: "S", colorHex: null }, { id: "m", name: "M", colorHex: null }, { id: "l", name: "L", colorHex: null }] },
      { id: "color", name: "Color", display: "COLOR", variantMode: "ALWAYS", values: [{ id: "n", name: "Negro", colorHex: "#111111" }, { id: "r", name: "Rojo", colorHex: "#cc2222" }] },
      { id: "texto", name: "Texto a estampar", display: "SELECT", variantMode: "CUSTOM", values: [] },
    ],
  },
} satisfies Meta<typeof AttributesView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConAtributos: Story = {};
export const Vacio: Story = { args: { attributes: [] } };
