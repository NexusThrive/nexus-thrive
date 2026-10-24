import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import CountSheet from "./count-sheet";
import StockView from "./stock-view";
import TransferSheet from "./transfer-sheet";

const warehouses = [{ id: "w1", name: "Principal", code: null, isDefault: true }, { id: "w2", name: "Norte", code: "NOR", isDefault: false }, { id: "w3", name: "Sur", code: null, isDefault: false }];
const overview = [
  { productId: "p1", productName: "Barra de proteína", warehouseId: "w1", warehouseName: "Principal", quantity: 120, avgCost: 2_800, value: 336_000 },
  { productId: "p1", productName: "Barra de proteína", warehouseId: "w2", warehouseName: "Norte", quantity: 40, avgCost: 2_900, value: 116_000 },
  { productId: "p2", productName: "Proteína whey 2 lb", warehouseId: "w1", warehouseName: "Principal", quantity: 8, avgCost: 55_000, value: 440_000 },
  { productId: "p3", productName: "Shaker", warehouseId: "w2", warehouseName: "Norte", quantity: 15, avgCost: 9_000, value: 135_000 },
];
const transfers = [{ id: "t2", number: 2, code: "TR-0002", fromName: "Principal", toName: "Norte", lineCount: 2, units: 30, value: 150_000, note: "Reposición sede norte", createdAt: "2026-10-22T14:00:00.000Z" }, { id: "t1", number: 1, code: "TR-0001", fromName: "Norte", toName: "Sur", lineCount: 1, units: 5, value: 14_500, note: null, createdAt: "2026-10-18T14:00:00.000Z" }];
const counts = [{ id: "open", number: 4, code: "CT-0004", status: "DRAFT" as const, warehouseName: "Norte", createdAt: "2026-10-24T14:00:00.000Z", lines: 3, counted: 0, withDifference: 0 }, { id: "closed", number: 3, code: "CT-0003", status: "COMPLETED" as const, warehouseName: "Principal", createdAt: "2026-10-01T14:00:00.000Z", lines: 3, counted: 3, withDifference: 2 }];
const reorder = [
  { productId: "p2", name: "Proteína whey 2 lb", stock: 8, minStock: 5, maxStock: 30, reorderPoint: 10, onOrder: 6, suggested: 16, needsOrder: true },
  { productId: "p1", name: "Barra de proteína", stock: 160, minStock: 20, maxStock: 300, reorderPoint: 40, onOrder: 0, suggested: 0, needsOrder: false },
  { productId: "p3", name: "Shaker", stock: 15, minStock: 0, maxStock: null, reorderPoint: null, onOrder: 0, suggested: 0, needsOrder: false },
];
const products = [{ id: "p1", name: "Barra de proteína" }, { id: "p2", name: "Proteína whey 2 lb" }, { id: "p3", name: "Shaker" }];

/** El panel se abre sobre la página: un fondo visible evita que el contenedor de Storybook quede vacío. */
const Fondo = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[360px] text-[13px] text-muted-foreground">
    Existencias · fondo de la página
    {children}
  </div>
);

const meta = {
  title: "Páginas/Inventario/Existencias",
  component: StockView,
  decorators: [withShell],
  parameters: { layout: "padded", docs: { description: { component: "Parte de «Catálogo e inventario»: existencias por bodega con su costo promedio, traslados entre bodegas (el valor se conserva), conteos físicos que ajustan el kardex con motivo, y reposición con lo ya pedido a proveedores. Las acciones son de muestra en Storybook." } } },
  args: { slug: "demo", warehouses, overview, transfers, counts, reorder, products, purchasesActive: true },
} satisfies Meta<typeof StockView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const UnaSolaBodega: Story = { args: { warehouses: [warehouses[0]], overview: overview.filter((o) => o.warehouseId === "w1"), transfers: [] } };
export const SinMovimientos: Story = { args: { overview: [], transfers: [], counts: [], reorder: [] } };
export const SinComprasActivas: Story = { args: { purchasesActive: false } };
export const NuevoTraslado: Story = { render: () => <Fondo><TransferSheet slug="demo" warehouses={warehouses} products={products} overview={overview} onClose={() => undefined} /></Fondo> };
export const ConteoAbierto: Story = { render: () => <Fondo><CountSheet slug="demo" id="open" onClose={() => undefined} /></Fondo> };
export const ConteoCerrado: Story = { render: () => <Fondo><CountSheet slug="demo" id="closed" onClose={() => undefined} /></Fondo> };
