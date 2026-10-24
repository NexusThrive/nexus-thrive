import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { withShell } from "../../../../../.storybook/decorators";
import type { FunctionGroups, FunctionItem } from "@/lib/functions/functions";
import FunctionsView from "./functions-view";

const item = (id: FunctionItem["id"], label: string, pitch: string, extra: Partial<FunctionItem> = {}): FunctionItem => ({ id, label, pitch, specialty: false, beta: false, planned: false, active: false, reason: null, needs: null, setup: null, category: "Clientes y agenda", ...extra });

const groups: FunctionGroups = {
  inUse: [
    item("crm", "Clientes", "Clientes, fichas 360° y seguimiento.", { active: true }),
    item("finance", "Finanzas", "Cobros, gastos y caja menor.", { active: true, category: "Finanzas y contabilidad" }),
    item("inventory", "Catálogo e inventario", "Productos, servicios, planes y stock.", { active: true }),
    item("payments", "Pagos", "Cobros y control de pagos.", { active: true, category: "Ventas y cobros" }),
    item("einvoicing", "Factura electrónica", "Emite facturas electrónicas con tu proveedor autorizado.", { active: true, beta: true, needs: "billing", category: "Ventas y cobros", setup: { configured: false, hint: "Activa la factura electrónica y conecta tu proveedor autorizado.", href: "/factura-electronica" } }),
  ],
  suggested: [
    item("purchases", "Compras y proveedores", "Órdenes de compra, proveedores y recepción de mercancía.", { beta: true, needs: "inventory", category: "Compras y gastos", reason: "Controlas inventario de 3 productos: registra a quién le compras." }),
    item("memberships", "Membresías", "Planes, vencimientos y control de acceso.", { specialty: true, reason: "Va bien con un negocio de gimnasio." }),
  ],
  more: [
    item("billing", "Facturación", "Cuentas de cobro y recibos numerados.", { category: "Ventas y cobros" }),
    item("pos", "Punto de venta", "Vende en mostrador con turnos de caja, varias líneas y devoluciones.", { needs: "inventory", category: "Ventas y cobros" }),
    item("online_payments", "Cobros en línea", "Cobra con enlaces de pago y concilia lo que entra.", { needs: "payments", category: "Ventas y cobros" }),
    item("receivables", "Cartera", "Controla lo que te deben y lo que debes.", { needs: "billing", category: "Finanzas y contabilidad" }),
    item("accounting", "Contabilidad", "Plan de cuentas, asientos y estados financieros para tu contador.", { beta: true, needs: "finance", category: "Finanzas y contabilidad" }),
    item("taxes", "Impuestos y numeración", "Impuestos con vigencia y numeración de tus documentos.", { needs: "billing", category: "Finanzas y contabilidad" }),
    item("website", "Sitio web y tienda en línea", "Tu sitio web y tu tienda en línea, con pedidos y cobro.", { needs: "inventory", category: "Presencia en línea" }),
    item("google", "Ficha de Google", "Que Google muestre tus datos correctos y tu calificación.", { beta: true, category: "Presencia en línea" }),
    item("growth", "Campañas y reseñas", "Sabe de dónde vienen tus clientes y pide reseñas.", { needs: "website", category: "Presencia en línea" }),
    item("whatsapp", "WhatsApp", "Plantillas y mensajes a tus clientes.", { category: "Canales" }),
    item("construction", "Obras y presupuestos", "Obras, presupuestos y catálogo APU.", { specialty: true, category: "Obras y proyectos" }),
  ],
  planned: [item("orders", "Pedidos", "Pedidos y ventas.", { planned: true, category: "Productos y pedidos" })],
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
