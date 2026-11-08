import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ToastProvider } from "@/components/molecules/toast";
import { buildCategoryTree } from "@/lib/business/catalog/category-tree";
import CategoriesView from "./categories-view";

const tree = buildCategoryTree([
  { id: "ropa", name: "Ropa", parentId: null, position: 0, products: 2 },
  { id: "cam", name: "Camisetas", parentId: "ropa", position: 0, products: 5 },
  { id: "pan", name: "Pantalones", parentId: "ropa", position: 1, products: 3 },
  { id: "beb", name: "Bebidas", parentId: null, position: 1, products: 18 },
  { id: "acc", name: "Accesorios", parentId: null, position: 2, products: 0 },
]);

const meta = {
  title: "Páginas/Inventario/Categorías",
  component: CategoriesView,
  decorators: [(Story) => <ToastProvider><div className="p-5"><Story /></div></ToastProvider>],
  parameters: { layout: "fullscreen", docs: { description: { component: "Árbol de categorías (categoría y subcategoría): crear, renombrar, mover y borrar. Cada fila dice cuántos productos tiene." } } },
  args: { slug: "demo", tree },
} satisfies Meta<typeof CategoriesView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConCategorias: Story = {};
/** Sin categorías: estado vacío con datos de ejemplo, destacados y la importación desde Excel. */
export const Vacio: Story = { args: { tree: [] } };
