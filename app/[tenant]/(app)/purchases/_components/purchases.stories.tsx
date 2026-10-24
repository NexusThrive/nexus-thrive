import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import type { PartyRow } from "@/lib/parties/parties-db";
import type { OrderRow } from "@/lib/purchasing/purchases-db";
import OrderDetailSheet from "./order-detail-sheet";
import OrderSheet from "./order-sheet";
import PurchasesView from "./purchases-view";

const suppliers: PartyRow[] = [
  { id: "s1", kind: "COMPANY", documentType: "NIT", documentNumber: "900123456", legalName: "Distribuidora Andina SAS", tradeName: null, email: "ventas@andina.co", phone: "3001112233", city: "Medellín", active: true, roles: ["SUPPLIER"] },
  { id: "s2", kind: "PERSON", documentType: "CC", documentNumber: "1023456789", legalName: "Luis Gómez", tradeName: null, email: null, phone: "3102223344", city: null, active: true, roles: ["CUSTOMER", "SUPPLIER"] },
];
const orders: OrderRow[] = [
  { id: "draft", number: 7, code: "OC-0007", status: "DRAFT", supplierPartyId: "s1", supplierName: "Distribuidora Andina SAS", warehouseId: "w1", total: 1_785_000, expectedDate: "2026-10-30", createdAt: "2026-10-24T14:00:00.000Z", lineCount: 2, pendingUnits: 30 },
  { id: "partial", number: 6, code: "OC-0006", status: "PARTIAL", supplierPartyId: "s2", supplierName: "Luis Gómez", warehouseId: "w1", total: 420_000, expectedDate: null, createdAt: "2026-10-20T14:00:00.000Z", lineCount: 1, pendingUnits: 14 },
  { id: "received", number: 5, code: "OC-0005", status: "RECEIVED", supplierPartyId: "s1", supplierName: "Distribuidora Andina SAS", warehouseId: "w1", total: 950_000, expectedDate: null, createdAt: "2026-10-12T14:00:00.000Z", lineCount: 3, pendingUnits: 0 },
];
const products = [
  { id: "p1", name: "Proteína whey 2 lb", cost: 55_000, stock: 8 },
  { id: "p2", name: "Barra de proteína", cost: 4_000, stock: 40 },
];
const warehouses = [{ id: "w1", name: "Principal", isDefault: true }];

/** El panel se abre sobre la página: un fondo visible evita que el contenedor de Storybook quede vacío. */
const Fondo = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[360px] text-[13px] text-muted-foreground">
    Compras · fondo de la página
    {children}
  </div>
);

const meta = {
  title: "Páginas/Compras/Compras",
  component: PurchasesView,
  decorators: [withShell],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Compras a proveedores (módulo `purchases`): órdenes con su recepción de mercancía al inventario, y proveedores (terceros con rol SUPPLIER). Las acciones son de muestra en Storybook. Se activa por rubro: viene encendido en tienda, ferretería, restaurante, carpintería y mecánica, y se puede activar en cualquier otro desde Configuración → Módulos.",
      },
    },
  },
  args: { slug: "demo", orders, suppliers, products, warehouses, today: "2026-10-24" },
} satisfies Meta<typeof PurchasesView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SinOrdenes: Story = { args: { orders: [] } };
export const SinProveedores: Story = { args: { orders: [], suppliers: [] } };

export const NuevaOrden: Story = {
  render: () => (
    <Fondo>
      <OrderSheet slug="demo" suppliers={suppliers} products={products} warehouses={warehouses} today="2026-10-24" onClose={() => undefined} onNeedSupplier={() => undefined} />
    </Fondo>
  ),
};
export const NuevaOrdenSinProveedores: Story = {
  render: () => (
    <Fondo>
      <OrderSheet slug="demo" suppliers={[]} products={products} warehouses={warehouses} today="2026-10-24" onClose={() => undefined} onNeedSupplier={() => undefined} />
    </Fondo>
  ),
};
export const DetalleBorrador: Story = { render: () => <Fondo><OrderDetailSheet slug="demo" id="draft" today="2026-10-24" onClose={() => undefined} /></Fondo> };
export const DetalleRecibidaEnParte: Story = { render: () => <Fondo><OrderDetailSheet slug="demo" id="partial" today="2026-10-24" onClose={() => undefined} /></Fondo> };
export const DetalleRecibida: Story = { render: () => <Fondo><OrderDetailSheet slug="demo" id="received" today="2026-10-24" onClose={() => undefined} /></Fondo> };
export const DetalleNoExiste: Story = { render: () => <Fondo><OrderDetailSheet slug="demo" id="nada" today="2026-10-24" onClose={() => undefined} /></Fondo> };
