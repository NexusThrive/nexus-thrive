import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import type { FunctionGroups, FunctionItem } from "@/lib/functions/functions";
import FunctionsView from "./functions-view";

const item = (id: FunctionItem["id"], label: string, pitch: string, extra: Partial<FunctionItem> = {}): FunctionItem => ({ id, label, pitch, specialty: false, beta: false, planned: false, active: false, reason: null, needs: null, ...extra });

const groups: FunctionGroups = {
  inUse: [item("crm", "Clientes", "Clientes, fichas 360° y seguimiento.", { active: true }), item("finance", "Finanzas", "Cobros, gastos y caja menor.", { active: true }), item("inventory", "Catálogo e inventario", "Productos, servicios, planes y stock.", { active: true })],
  suggested: [
    item("purchases", "Compras y proveedores", "Órdenes de compra, proveedores y recepción de mercancía.", { beta: true, needs: "inventory", reason: "Controlas inventario de 3 productos: registra a quién se lo compras y recibe la mercancía con su costo." }),
    item("memberships", "Membresías", "Planes, vencimientos y control de acceso.", { specialty: true, reason: "Va bien con un negocio de gimnasio." }),
  ],
  more: [item("billing", "Facturación", "Cuentas de cobro y recibos numerados."), item("whatsapp", "WhatsApp", "Plantillas y mensajes a tus clientes."), item("construction", "Obras y presupuestos", "Obras, presupuesto APU, bitácora e informes.", { specialty: true })],
};

const meta = {
  title: "Páginas/Funciones/Funciones",
  component: FunctionsView,
  decorators: [withShell],
  parameters: {
    layout: "padded",
    docs: { description: { component: "Todo el sistema, incluido en tu plan: lo que usas, lo que te sugerimos (por tu rubro y por lo que haces) y el resto. Encender una función la agrega al menú; apagarla la quita sin borrar datos. El rubro es un perfil: sugiere, no bloquea." } },
  },
  args: { slug: "demo", groups, canManage: true, profile: "Gimnasio" },
} satisfies Meta<typeof FunctionsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SoloLectura: Story = { args: { canManage: false } };
export const SinSugerencias: Story = { args: { groups: { ...groups, suggested: [] }, profile: null } };
