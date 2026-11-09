import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ToastProvider } from "@/components/molecules/toast";
import type { AttributeRow } from "@/lib/business/catalog/attributes-db";
import type { CategoryRow } from "@/lib/business/catalog/category-tree";
import { EMPTY_PRODUCT_DRAFT } from "@/lib/business/catalog/product-form";
import type { ProductRow } from "@/lib/business/catalog/products-db";
import CatalogView from "./catalog-view";
import ProductForm from "./product-form";
import { ProductPreview } from "./product-preview";

const categories: CategoryRow[] = [
  { id: "ropa", name: "Ropa", parentId: null, position: 0, products: 3 },
  { id: "cam", name: "Camisetas", parentId: "ropa", position: 0, products: 2 },
  { id: "beb", name: "Bebidas", parentId: null, position: 1, products: 1 },
];
const product = (id: string, name: string, price: number, extra: Partial<ProductRow> = {}): ProductRow => ({
  id, kind: "PRODUCT", name, description: null, sku: null, category: null, price, cost: null, trackStock: true, stock: 12, minStock: 3, unit: null,
  durationMinutes: null, durationDays: null, capacity: null, active: true, taxRatePct: 19, categoryId: null, brand: null, imageUrl: null,
  favorite: false, sellable: true, purchasable: true, posEnabled: true, customizable: false, publishedOnline: false, ...extra,
});
const products: ProductRow[] = [
  product("1", "Camiseta básica", 45_000, { categoryId: "cam", category: "Camisetas", sku: "CAM-0001", favorite: true }),
  product("2", "Camiseta estampada", 52_000, { categoryId: "cam", category: "Camisetas", stock: 2 }),
  product("3", "Gaseosa 400 ml", 3_500, { categoryId: "beb", category: "Bebidas", stock: 0 }),
  product("4", "Taza personalizada", 28_000, { trackStock: false, customizable: true }),
];
const attributes: AttributeRow[] = [
  { id: "talla", name: "Talla", display: "BUTTONS", variantMode: "ALWAYS", values: [{ id: "s", name: "S", colorHex: null }, { id: "m", name: "M", colorHex: null }, { id: "l", name: "L", colorHex: null }] },
  { id: "color", name: "Color", display: "COLOR", variantMode: "ALWAYS", values: [{ id: "n", name: "Negro", colorHex: "#111111" }, { id: "r", name: "Rojo", colorHex: "#cc2222" }] },
  { id: "texto", name: "Texto a estampar", display: "SELECT", variantMode: "CUSTOM", values: [] },
];

const meta = {
  title: "Páginas/Inventario/Catálogo",
  component: CatalogView,
  decorators: [(Story) => <ToastProvider><div className="p-5"><Story /></div></ToastProvider>],
  parameters: { layout: "fullscreen", docs: { description: { component: "Catálogo: tarjetas con foto o tabla, filtro por categoría y búsqueda. Crear y editar son páginas aparte (formulario con previsualización)." } } },
  args: { slug: "demo", products, kinds: ["PRODUCT", "SERVICE"], categories, customers: [], canManage: true, vista: "tarjetas" },
} satisfies Meta<typeof CatalogView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tarjetas: Story = {};
export const Tabla: Story = { args: { vista: "tabla" } };
/** Sin productos: el estado vacío con datos de ejemplo, destacados y la importación desde Excel. */
export const Vacio: Story = { args: { products: [] } };
/** Un filtro que no encuentra nada: ofrece quitarlo. */
export const SinCoincidencias: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole("searchbox", { name: "Buscar" }), "zzzz");
    await expect(await within(canvasElement).findByText(/coincide con estos filtros/)).toBeVisible();
    await expect(within(canvasElement).getByRole("button", { name: /Quitar filtros/ })).toBeVisible();
  },
};

export const Previsualizacion: StoryObj<typeof ProductPreview> = {
  render: () => <div className="max-w-sm p-5"><ProductPreview data={{ name: "Camiseta básica", price: 45_000, categoryLabel: "Ropa › Camisetas", brand: "Nexus", imageSrc: null, favorite: true, trackStock: true, stock: 24, posEnabled: true, publishedOnline: true, active: true, customizable: false }} /></div>,
};

export const FormularioNuevo: StoryObj<typeof ProductForm> = {
  render: () => (
    <ToastProvider>
      <div className="p-5"><ProductForm slug="demo" productId={null} initial={EMPTY_PRODUCT_DRAFT} kinds={["PRODUCT", "SERVICE"]} categories={categories} attributes={attributes} variantNames={[]} stock={null} imageUrl={null} /></div>
    </ToastProvider>
  ),
  play: async ({ canvasElement }) => {
    const form = within(canvasElement);
    await userEvent.click(form.getByRole("button", { name: "Crear producto" }));
    // Sin nombre ni precio, el servidor no se llama: el formulario avisa en el campo (validación del servidor simulada en el mock).
    await expect(form.getByRole("tab", { name: "Información general" })).toHaveAttribute("aria-selected", "true");
  },
};

export const FormularioEditar: StoryObj<typeof ProductForm> = {
  render: () => (
    <ToastProvider>
      <div className="p-5">
        <ProductForm slug="demo" productId="1" initial={{ ...EMPTY_PRODUCT_DRAFT, name: "Camiseta básica", price: 45_000, cost: 22_000, sku: "CAM-0001", categoryId: "cam", favorite: true, posEnabled: true, publishedOnline: true, attributeLines: [{ attributeId: "talla", valueIds: ["s", "m"] }] }} kinds={["PRODUCT", "SERVICE"]} categories={categories} attributes={attributes} variantNames={["Camiseta básica · S", "Camiseta básica · M"]} stock={24} imageUrl={null} />
      </div>
    </ToastProvider>
  ),
};
